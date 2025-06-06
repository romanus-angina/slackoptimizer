import { App as SlackApp, ExpressReceiver } from '@slack/bolt';
import { BaseController } from './BaseController';
import { ClassificationRequest } from '../types/backend';
import { SlackMessage, SlackEvent } from '../types/slack';
import { BackendAPIService } from '../services/BackEndAPIService'; 

export class SlackEventController extends BaseController {
  protected backendAPI: BackendAPIService;

  constructor(slackApp: SlackApp, expressReceiver: ExpressReceiver) {
    super(slackApp, expressReceiver);
    this.backendAPI = new BackendAPIService(); 
  }

  register(): void {
    // Handle app mentions specifically (most specific first)
    this.slackApp.event('app_mention', this.handleAppMention.bind(this));

    // Handle all messages with our custom filtering
    this.slackApp.message(this.handleAllMessages.bind(this));

    console.log('[SlackEventController] Event handlers registered');
  }

  private async handleAllMessages({ message, event, client }: any): Promise<void> {
    try {
      // Skip bot messages and our own messages
      if (message.bot_id || message.user === process.env.SLACK_BOT_USER_ID) {
        return;
      }

      // Skip if no user (shouldn't happen but safety first)
      if (!message.user) {
        return;
      }

      // Determine if this is a direct message
      const isDM = this.isDirectMessage(message);

      if (isDM) {
        await this.handleDirectMessage({ message, client });
      } else {
        await this.handleChannelMessage({ message, event, client });
      }

    } catch (error) {
      this.handleError(error as Error, 'handleAllMessages');
    }
  }

  private isDirectMessage(message: any): boolean {
    // Check if it's a DM by looking at the channel ID
    // DM channels start with 'D' in Slack
    return message.channel && message.channel.startsWith('D');
  }

  private async handleChannelMessage({ message, event, client }: any): Promise<void> {
    try {
      console.log(`Processing channel message from ${message.user} in ${message.channel}`);

      // Get user and channel information
      const slackUser = await this.getSlackUser(message.user, event.team || '');
      const channelInfo = await this.getChannelInfo(message.channel);

      if (!slackUser || !channelInfo) {
        console.warn('Failed to get user or channel info, skipping message');
        return;
      }

      // Ensure user exists in backend
      await this.ensureUserExists(slackUser);

      // Check if backend is available
      const backendHealthy = await this.isBackendHealthy();
      if (!backendHealthy) {
        console.warn('Backend unavailable, skipping message classification');
        return;
      }

      // Get user settings
      const backendUser = await this.backendAPI.getUser(slackUser.id, slackUser.team_id);
      if (!backendUser) {
        console.warn(`User ${slackUser.id} not found in backend, skipping`);
        return;
      }

      // Build classification request
      const classificationRequest: ClassificationRequest = {
        message: {
          text: message.text || '',
          user_id: message.user,
          channel_id: message.channel,
          timestamp: message.ts,
          thread_ts: message.thread_ts
        },
        context: {
          user_settings: backendUser.settings,
          channel_info: {
            name: channelInfo.name,
            is_private: channelInfo.is_private,
            member_count: undefined // We could fetch this if needed
          }
        }
      };

      // Classify the message
      const result = await this.backendAPI.classifyMessage(classificationRequest);

      console.log(`Classification result for message ${message.ts}:`, {
        should_notify: result.should_notify,
        category: result.category,
        confidence: result.confidence
      });

      // Handle the classification result
      if (result.should_notify) {
        await this.handleNotification(slackUser, message, channelInfo, result);
      } else {
        // Log filtered message for analytics
        console.log(`Message filtered: ${result.reasoning}`);
      }

    } catch (error) {
      this.handleError(error as Error, 'handleChannelMessage');
    }
  }

  private async handleAppMention({ event, client }: any): Promise<void> {
    try {
      console.log(`App mentioned by ${event.user} in ${event.channel}`);

      // Get user info
      const slackUser = await this.getSlackUser(event.user, event.team || '');
      if (!slackUser) {
        return;
      }

      // Simple response for now - we'll build proper interaction handling later
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts, // Reply in thread
        text: `Hi <@${event.user}>! 👋 I'm your Smart Notifications assistant. Go to the Home tab to configure your notification preferences!`
      });

    } catch (error) {
      this.handleError(error as Error, 'handleAppMention');
    }
  }

  private async handleDirectMessage({ message, client }: any): Promise<void> {
    try {
      // Skip bot messages
      if (message.bot_id) {
        return;
      }

      console.log(`Direct message from ${message.user}`);

      // Get user info
      const slackUser = await this.getSlackUser(message.user, message.team || '');
      if (!slackUser) {
        return;
      }

      // Simple help response for now
      await client.chat.postMessage({
        channel: message.channel,
        text: `Hello! 👋 I'm your Smart Notifications assistant.\n\n` +
              `To get started, visit the *Home* tab above or type \`/smart-notifications help\` in any channel.\n\n` +
              `I can help you:\n` +
              `• Filter notifications based on importance\n` +
              `• Set quiet hours\n` +
              `• Customize per-channel settings\n` +
              `• View your notification analytics`
      });

    } catch (error) {
      this.handleError(error as Error, 'handleDirectMessage');
    }
  }

  private async handleNotification(
    user: any, 
    message: any, 
    channelInfo: any, 
    classificationResult: any
  ): Promise<void> {
    try {
      console.log(`Processing notification for user ${user.id}`);
  
      const userSettings = user.settings || {};
      const delivery = userSettings.delivery_preferences || this.getDefaultDeliveryPreferences();
  
      // Store in feed if enabled (always store first)
      if (delivery.feed_enabled) {
        await this.storeInNotificationFeed(user, message, channelInfo, classificationResult);
      }
  
      // Decide if we should send a DM
      const shouldSendDM = this.shouldSendDM(classificationResult, delivery, user);
      
      if (shouldSendDM) {
        await this.sendSmartDM(user, message, channelInfo, classificationResult);
      }
  
      // Track the notification
      await this.trackNotificationSent(user, message, classificationResult, shouldSendDM);
  
    } catch (error) {
      console.error('Failed to handle notification:', error);
    }
  }
  
  private shouldSendDM(
    result: any, 
    delivery: any, 
    user: any
  ): boolean {
    // Check quiet hours first
    if (this.isInQuietHours(user, result)) {
      console.log('In quiet hours, skipping DM');
      return false;
    }
  
    // Check delivery preferences based on classification
    switch (result.category) {
      case 'urgent':
        return delivery.urgent_via_dm;
      
      case 'important':
        return delivery.important_via_dm;
      
      case 'mention':
        return delivery.mentions_via_dm;
      
      default:
        // For other categories, only send if it's high priority and urgent DMs are enabled
        return result.priority === 'high' && delivery.urgent_via_dm;
    }
  }

  private async sendSmartDM(
    user: any, 
    message: any, 
    channelInfo: any, 
    result: any
  ): Promise<void> {
    try {
      const notificationBlocks = this.buildSmartDMBlocks(message, channelInfo, result);
  
      await this.slackApp.client.chat.postMessage({
        channel: user.id, // Send as DM
        text: `🧠 Smart notification from #${channelInfo.name}`,
        blocks: notificationBlocks,
        unfurl_links: false,
        unfurl_media: false
      });
  
      console.log(`Smart DM sent to ${user.id}`);
  
    } catch (error) {
      console.error('Failed to send smart DM:', error);
      throw error;
    }
  }
  
  private buildSmartDMBlocks(message: any, channelInfo: any, result: any): any[] {
    const priorityEmoji = result.priority === 'high' ? '🚨' : 
                         result.priority === 'medium' ? '⚠️' : '💬';
    
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${priorityEmoji} *Smart Notification from #${channelInfo.name}*\n` +
                `_${result.category.toUpperCase()} • ${result.confidence}% confidence_`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `> ${this.truncateText(message.text, 200)}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `💡 *Why this is important:* ${result.reasoning}`
          }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👀 View in Channel'
            },
            url: `https://slack.com/app_redirect?channel=${message.channel}&message_ts=${message.ts}`
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📱 View in App'
            },
            action_id: 'open_app_home'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Got it'
            },
            action_id: 'acknowledge_notification',
            value: message.ts
          }
        ]
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '⚙️ Adjust your notification preferences anytime in the app settings'
          }
        ]
      }
    ];
  }
  
  private async storeInNotificationFeed(
    user: any, 
    message: any, 
    channelInfo: any, 
    result: any
  ): Promise<void> {
    try {
      // For hackathon demo - use a simple HTTP client instead of the full backend service
      const response = await fetch(`${process.env.BACKEND_API_URL}/notifications/feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BACKEND_API_KEY}`
        },
        body: JSON.stringify({
          user_id: user.id,
          team_id: user.team_id,
          message_data: {
            text: message.text,
            channel: message.channel,
            channel_name: channelInfo.name,
            timestamp: message.ts,
            user: message.user,
            thread_ts: message.thread_ts
          },
          classification: {
            category: result.category,
            confidence: result.confidence,
            reasoning: result.reasoning,
            priority: result.priority
          },
          created_at: new Date().toISOString()
        })
      });
  
      if (response.ok) {
        console.log(`Notification stored in feed for user ${user.id}`);
      } else {
        console.warn(`Failed to store notification: ${response.status}`);
      }
  
    } catch (error) {
      console.error('Failed to store in notification feed:', error);
      // Don't throw - this shouldn't break the main flow
    }
  }
  
  private getDefaultDeliveryPreferences(): any {
    return {
      urgent_via_dm: true,
      important_via_dm: true,
      mentions_via_dm: false,
      feed_enabled: true
    };
  }
  
  private async trackNotificationSent(
    user: any, 
    message: any, 
    result: any, 
    sentDM: boolean
  ): Promise<void> {
    try {
      // For hackathon demo - simple tracking
      const response = await fetch(`${process.env.BACKEND_API_URL}/analytics/notification-processed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BACKEND_API_KEY}`
        },
        body: JSON.stringify({
          user_id: user.id,
          team_id: user.team_id,
          message_id: message.ts,
          channel_id: message.channel,
          category: result.category,
          confidence: result.confidence,
          priority: result.priority,
          sent_dm: sentDM,
          stored_in_feed: true,
          processed_at: new Date().toISOString()
        })
      });

      if (response.ok) {
        console.log(`Notification tracked for user ${user.id}`);
      }
    } catch (error) {
      console.error('Failed to track notification:', error);
    }
  }
  
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private isInQuietHours(user: any, result: any): boolean {
    const settings = user.settings?.quiet_hours;
    if (!settings?.enabled) return false;
    
    // Always allow urgent messages
    if (result.category === 'urgent') return false;

    const now = new Date();
    const start = new Date();
    const end = new Date();
    
    const [startHour, startMin] = (settings.start_time || '22:00').split(':').map(Number);
    const [endHour, endMin] = (settings.end_time || '08:00').split(':').map(Number);
    
    start.setHours(startHour, startMin, 0);
    end.setHours(endHour, endMin, 0);
    
    return now >= start || now < end;
  }

  // Add these helper methods that were referenced from BaseController
  protected async ensureUserExists(slackUser: any): Promise<void> {
    try {
      const existingUser = await this.backendAPI.getUser(slackUser.id, slackUser.team_id);
      
      if (!existingUser) {
        console.log(`Creating new user in backend: ${slackUser.id}`);
        await this.backendAPI.createUser({
          slack_user_id: slackUser.id,
          team_id: slackUser.team_id,
          email: slackUser.email || `${slackUser.id}@slack.local`
        });
      }
    } catch (error) {
      console.error(`Failed to ensure user exists: ${slackUser.id}`, error);
      // Don't throw for hackathon - just log the error
    }
  }

  protected async isBackendHealthy(): Promise<boolean> {
    try {
      return await this.backendAPI.isBackendAvailable();
    } catch (error) {
      console.warn('Backend health check failed:', error);
      return false;
    }
  }

  // Helper method to process message for testing
  public async testMessage(
    userId: string, 
    teamId: string, 
    messageText: string, 
    channelId: string
  ): Promise<any> {
    try {
      const result = await this.backendAPI.testClassifyMessage(
        messageText, 
        userId, 
        channelId
      );

      return {
        success: true,
        result: result
      };

    } catch (error) {
      this.handleError(error as Error, 'testMessage');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}