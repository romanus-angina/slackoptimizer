import { App as SlackApp, ExpressReceiver } from '@slack/bolt';
import { BaseController } from './BaseController';
import { ClassificationRequest } from '../types/backend';
import { SlackMessage, SlackEvent } from '../types/slack';

export class SlackEventController extends BaseController {
  constructor(slackApp: SlackApp, expressReceiver: ExpressReceiver) {
    super(slackApp, expressReceiver);
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
    channel: any, 
    classification: any
  ): Promise<void> {
    try {
      // For now, we'll just log notifications
      // Later we'll implement actual notification delivery
      console.log(`[NOTIFICATION] User ${user.id} should be notified about message in ${channel.name}:`, {
        category: classification.category,
        priority: classification.priority,
        confidence: classification.confidence,
        reasoning: classification.reasoning
      });

      // TODO: Implement actual notification logic
      // This could involve:
      // - Sending push notifications
      // - Adding to a notification queue
      // - Updating user's notification feed
      // - Sending email notifications (if configured)

    } catch (error) {
      this.handleError(error as Error, 'handleNotification');
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