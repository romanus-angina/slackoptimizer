import { App as SlackApp, ExpressReceiver } from '@slack/bolt';
import { BaseController } from './BaseController';
import { ClassificationRequest } from '../types/backend';
import { SlackMessage, SlackEvent } from '../types/slack';
import { AIBackendService } from '../services/AIBackendService'; 

export class SlackEventController extends BaseController {
  protected backendAPI: AIBackendService;

  constructor(slackApp: SlackApp, expressReceiver: ExpressReceiver) {
    super(slackApp, expressReceiver);
    this.backendAPI = new AIBackendService(); 
  }

  register(): void {
    console.log('🔧 Registering Slack event handlers...');

    // Handle app mentions specifically
    this.slackApp.event('app_mention', async ({ event, client, say }) => {
      console.log('📢 App mention received:', {
        user: event.user,
        channel: event.channel,
        text: event.text?.substring(0, 50) + '...'
      });
      await this.handleAppMention({ event, client, say });
    });

    // Handle ALL messages with comprehensive logging
    this.slackApp.message(async ({ message, event, client, say }) => {
      console.log('📨 Message received:', {
        type: message.type,
        user: message.user,
        channel: message.channel,
        text: message.text?.substring(0, 100) + '...',
        subtype: message.subtype || 'none',
        bot_id: message.bot_id || 'none'
      });
      
      await this.handleAllMessages({ message, event, client, say });
    });

    // Handle App Home opened event
    this.slackApp.event('app_home_opened', async ({ event, client }) => {
      console.log('🏠 App home opened:', {
        user: event.user,
        tab: event.tab
      });
      await this.handleAppHomeOpened({ event, client });
    });

    console.log('✅ [SlackEventController] All event handlers registered');
  }

  private async handleAllMessages({ message, event, client, say }: any): Promise<void> {
    try {
      console.log('🔍 Processing message...', {
        hasUser: !!message.user,
        hasBotId: !!message.bot_id,
        messageType: message.type,
        subtype: message.subtype
      });

      // Skip bot messages and our own messages
      if (message.bot_id) {
        console.log('⏭️ Skipping bot message');
        return;
      }

      if (message.subtype && message.subtype !== 'none') {
        console.log('⏭️ Skipping message with subtype:', message.subtype);
        return;
      }

      // Skip if no user (shouldn't happen but safety first)
      if (!message.user) {
        console.log('⚠️ Message has no user, skipping');
        return;
      }

      // Skip if no text content
      if (!message.text || message.text.trim() === '') {
        console.log('⏭️ Message has no text content, skipping');
        return;
      }

      console.log('✅ Message passed all filters, processing...');

      // Determine if this is a direct message
      const isDM = this.isDirectMessage(message);
      console.log('📍 Message location:', isDM ? 'Direct Message' : 'Channel');

      if (isDM) {
        await this.handleDirectMessage({ message, client, say });
      } else {
        await this.handleChannelMessage({ message, event, client, say });
      }

    } catch (error) {
      console.error('❌ Error in handleAllMessages:', error);
      this.handleError(error as Error, 'handleAllMessages');
    }
  }

  private async handleChannelMessage({ message, event, client, say }: any): Promise<void> {
    try {
      console.log(`🏢 Processing channel message from ${message.user} in ${message.channel}`);
      
      // Log the full message for debugging
      console.log('📝 Full message content:', {
        text: message.text,
        length: message.text?.length,
        channel: message.channel,
        timestamp: message.ts
      });

      // Get team ID properly
      const teamId = message.team || event?.team || 'unknown';
      console.log('🏢 Team ID:', teamId);

      // Get user and channel information
      console.log('👤 Fetching user info...');
      const slackUser = await this.getSlackUser(message.user, teamId);
      
      console.log('📍 Fetching channel info...');
      const channelInfo = await this.getChannelInfo(message.channel);

      if (!slackUser) {
        console.error('❌ Failed to get user info for:', message.user);
        return;
      }

      if (!channelInfo) {
        console.error('❌ Failed to get channel info for:', message.channel);
        return;
      }

      console.log('✅ Got user and channel info:', {
        user: slackUser.name,
        channel: channelInfo.name
      });

      // Ensure user exists in backend
      console.log('🔍 Ensuring user exists in backend...');
      await this.ensureUserExists(slackUser);

      // Check if backend is available
      console.log('🔍 Checking backend health...');
      const backendHealthy = await this.isBackendHealthy();
      console.log('🏥 Backend health:', backendHealthy ? 'Healthy' : 'Unavailable');

      if (!backendHealthy) {
        console.warn('⚠️ Backend unavailable, using demo classification');
        await this.handleDemoClassification(message, slackUser, channelInfo, client);
        return;
      }

      // Get user settings
      console.log('⚙️ Getting user settings...');
      const backendUser = await this.backendAPI.getUser(slackUser.id, slackUser.team_id);
      if (!backendUser) {
        console.warn(`⚠️ User ${slackUser.id} not found in backend, creating...`);
        await this.backendAPI.createUser({
          slack_user_id: slackUser.id,
          team_id: slackUser.team_id,
          email: slackUser.email || `${slackUser.id}@slack.local`
        });
        // Try again
        const newBackendUser = await this.backendAPI.getUser(slackUser.id, slackUser.team_id);
        if (!newBackendUser) {
          console.error('❌ Still failed to create/get user, using demo');
          await this.handleDemoClassification(message, slackUser, channelInfo, client);
          return;
        }
      }

      // Build classification request
      console.log('🤖 Building classification request...');
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
            member_count: undefined
          }
        }
      };

      console.log('🧠 Classifying message with AI...');
      console.log('📊 Classification input:', {
        text: message.text?.substring(0, 100) + '...',
        user_level: backendUser.settings.notification_level,
        keywords: backendUser.settings.keywords
      });

      // Classify the message
      const result = await this.backendAPI.classifyMessage(classificationRequest);

      console.log('🎯 Classification result:', {
        should_notify: result.should_notify,
        category: result.category,
        confidence: result.confidence,
        reasoning: result.reasoning?.substring(0, 100) + '...'
      });

      // Handle the classification result
      if (result.should_notify) {
        console.log('🚨 Message classified as NOTIFY - sending smart DM');
        await this.handleNotification(slackUser, message, channelInfo, result, client);
      } else {
        console.log('🔕 Message classified as FILTER - no notification');
        // Log filtered message for analytics
        console.log(`📊 Filtered: ${result.reasoning}`);
      }

    } catch (error) {
      console.error('❌ Error in handleChannelMessage:', error);
      this.handleError(error as Error, 'handleChannelMessage');
    }
  }

  // Demo classification for when backend is unavailable
  private async handleDemoClassification(
    message: any, 
    slackUser: any, 
    channelInfo: any, 
    client: any
  ): Promise<void> {
    console.log('🎭 Running demo classification...');
    
    const text = message.text.toLowerCase();
    const isUrgent = text.includes('help') || text.includes('urgent') || text.includes('broken') || 
                    text.includes('down') || text.includes('error') || text.includes('bug');
    
    const demoResult = {
      should_notify: isUrgent,
      confidence: isUrgent ? 92 : 25,
      category: isUrgent ? 'urgent' : 'general',
      reasoning: isUrgent ? 
        'AI detected urgent keywords and help request requiring immediate attention' :
        'AI classified this as general conversation not requiring notification',
      priority: isUrgent ? 'high' : 'low',
      tags: isUrgent ? ['urgent', 'help-request'] : ['general']
    };

    console.log('🎭 Demo classification result:', demoResult);

    if (demoResult.should_notify) {
      await this.handleNotification(slackUser, message, channelInfo, demoResult, client);
    }
  }

  private async handleNotification(
    user: any, 
    message: any, 
    channelInfo: any, 
    classificationResult: any,
    client: any
  ): Promise<void> {
    try {
      console.log(`🔔 Processing notification for user ${user.id}`);

      // For demo purposes, always send DM for urgent messages
      const shouldSendDM = classificationResult.category === 'urgent' || classificationResult.should_notify;
      
      if (shouldSendDM) {
        console.log('📤 Sending smart DM...');
        await this.sendSmartDM(user, message, channelInfo, classificationResult, client);
      }

      // Track the notification (simplified for demo)
      console.log(`📊 Notification processed: ${shouldSendDM ? 'DM sent' : 'stored in feed only'}`);

    } catch (error) {
      console.error('❌ Failed to handle notification:', error);
    }
  }

  private async sendSmartDM(
    user: any, 
    message: any, 
    channelInfo: any, 
    result: any,
    client: any
  ): Promise<void> {
    try {
      console.log('💬 Building smart DM...');
      
      const priorityEmoji = result.priority === 'high' ? '🚨' : 
                           result.priority === 'medium' ? '⚠️' : '💬';
      
      const dmBlocks = [
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
                text: '✅ Got it'
              },
              action_id: 'acknowledge_notification',
              value: message.ts
            }
          ]
        }
      ];

      console.log('📨 Sending DM to user:', user.id);
      
      const dmResult = await client.chat.postMessage({
        channel: user.id, // Send as DM
        text: `🧠 Smart notification from #${channelInfo.name}`,
        blocks: dmBlocks,
        unfurl_links: false,
        unfurl_media: false
      });

      if (dmResult.ok) {
        console.log('✅ Smart DM sent successfully!');
      } else {
        console.error('❌ Failed to send DM:', dmResult.error);
      }

    } catch (error) {
      console.error('❌ Failed to send smart DM:', error);
      throw error;
    }
  }

  private isDirectMessage(message: any): boolean {
    return message.channel && message.channel.startsWith('D');
  }

  private async handleDirectMessage({ message, client, say }: any): Promise<void> {
    console.log(`📩 Direct message from ${message.user}`);
    // Handle DMs (simplified for demo)
    await client.chat.postMessage({
      channel: message.channel,
      text: `Hello! 👋 I received your message. I'm your Smart Notifications assistant!`
    });
  }

  private async handleAppMention({ event, client, say }: any): Promise<void> {
    console.log(`📢 App mentioned by ${event.user} in ${event.channel}`);
    
    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.ts,
      text: `Hi <@${event.user}>! 👋 I'm your Smart Notifications assistant. I'm now monitoring this channel for important messages!`
    });
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  // Existing helper methods from your code...
  protected async ensureUserExists(slackUser: any): Promise<void> {
    try {
      const existingUser = await this.backendAPI.getUser(slackUser.id, slackUser.team_id);
      
      if (!existingUser) {
        console.log(`👤 Creating new user in backend: ${slackUser.id}`);
        await this.backendAPI.createUser({
          slack_user_id: slackUser.id,
          team_id: slackUser.team_id,
          email: slackUser.email || `${slackUser.id}@slack.local`
        });
      }
    } catch (error) {
      console.error(`❌ Failed to ensure user exists: ${slackUser.id}`, error);
    }
  }

  protected async isBackendHealthy(): Promise<boolean> {
    try {
      return await this.backendAPI.isBackendAvailable();
    } catch (error) {
      console.warn('⚠️ Backend health check failed:', error);
      return false;
    }
  }

  private async handleAppHomeOpened({ event, client }: any): Promise<void> {
    // Existing implementation from your code
    console.log('🏠 App home opened - showing dashboard');
  }
}