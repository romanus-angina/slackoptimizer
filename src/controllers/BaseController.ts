import { App as SlackApp, ExpressReceiver } from '@slack/bolt';
import { BackendAPIService } from '../services/BackEndAPIService';
import { SlackUser } from '../types/slack';

export abstract class BaseController {
  protected slackApp: SlackApp;
  protected expressReceiver: ExpressReceiver;
  protected backendAPI: BackendAPIService;

  constructor(slackApp: SlackApp, expressReceiver: ExpressReceiver) {
    this.slackApp = slackApp;
    this.expressReceiver = expressReceiver;
    this.backendAPI = new BackendAPIService();
  }

  // Helper method to extract user info from Slack events
  protected async getSlackUser(userId: string, teamId: string): Promise<SlackUser | null> {
    try {
      // FIXED: Remove manual token - let Bolt handle it
      const result = await this.slackApp.client.users.info({
        user: userId
      });

      if (!result.ok || !result.user) {
        throw new Error('Failed to fetch user info');
      }

      return {
        id: result.user.id!,
        name: result.user.name || result.user.real_name || 'Unknown',
        email: result.user.profile?.email || '',
        team_id: teamId,
        timezone: result.user.tz
      };
    } catch (error) {
      console.error(`Failed to get Slack user ${userId}:`, error);
      return null;
    }
  }

  // Helper method to get channel info
  protected async getChannelInfo(channelId: string) {
    try {
      // FIXED: Remove manual token - let Bolt handle it
      const result = await this.slackApp.client.conversations.info({
        channel: channelId
      });

      if (!result.ok || !result.channel) {
        throw new Error('Failed to fetch channel info');
      }

      return {
        id: result.channel.id!,
        name: result.channel.name || 'unknown',
        is_private: result.channel.is_private || false,
        is_member: result.channel.is_member || false,
        topic: result.channel.topic,
        purpose: result.channel.purpose
      };
    } catch (error) {
      console.error(`Failed to get channel info ${channelId}:`, error);
      return null;
    }
  }

  // Helper method to handle errors consistently
  protected handleError(error: Error, context: string): void {
    console.error(`[${this.constructor.name}] Error in ${context}:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  // Helper method to respond to interactions with error handling
  protected async respondToInteraction(
    respond: Function,
    message: string,
    ephemeral = true
  ): Promise<void> {
    try {
      await respond({
        text: message,
        response_type: ephemeral ? 'ephemeral' : 'in_channel'
      });
    } catch (error) {
      console.error('Failed to respond to interaction:', error);
    }
  }

  // Helper method to send DM to user
  protected async sendDirectMessage(userId: string, message: string): Promise<void> {
    try {
      // FIXED: Remove manual token - let Bolt handle it
      await this.slackApp.client.chat.postMessage({
        channel: userId,
        text: message
      });
    } catch (error) {
      console.error(`Failed to send DM to ${userId}:`, error);
    }
  }

  // Helper method for backend health checks
  protected async isBackendHealthy(): Promise<boolean> {
    return this.backendAPI.isBackendAvailable();
  }

  // Helper method to ensure user exists in backend
  protected async ensureUserExists(slackUser: SlackUser): Promise<void> {
    try {
      // Check if user exists
      const existingUser = await this.backendAPI.getUser(
        slackUser.id, 
        slackUser.team_id
      );

      // Create user if doesn't exist
      if (!existingUser) {
        console.log(`Creating new user in backend: ${slackUser.id}`);
        await this.backendAPI.createUser({
          slack_user_id: slackUser.id,
          team_id: slackUser.team_id,
          email: slackUser.email
        });
      }
    } catch (error) {
      console.error(`Failed to ensure user exists: ${slackUser.id}`, error);
      // Don't throw error - just log it for hackathon demo
    }
  }

  // Abstract method that subclasses must implement
  abstract register(): void;
}