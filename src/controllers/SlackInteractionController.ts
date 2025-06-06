import { ExpressReceiver, App as SlackApp } from '@slack/bolt';
import { BaseController } from './BaseController';
import { ActionPayload } from '../types/ui';
import { SettingsView } from '../views/SettingsView';
import { TestMessageView } from '../views/TestMessageView';

export class SlackInteractionController extends BaseController {
  constructor(slackApp: SlackApp, expressReceiver: ExpressReceiver) {
    super(slackApp, expressReceiver);
  }

  register(): void {
    // Handle button clicks
    this.slackApp.action('get_started', this.handleGetStarted.bind(this));
    this.slackApp.action(/settings_.*/, this.handleSettingsAction.bind(this));
    this.slackApp.action(/test_.*/, this.handleTestAction.bind(this));
    this.slackApp.action(/analytics_.*/, this.handleAnalyticsAction.bind(this));

    // Handle view submissions (modals)
    this.slackApp.view('settings_modal', this.handleSettingsSubmission.bind(this));
    this.slackApp.view('test_modal', this.handleTestSubmission.bind(this));

    // Handle shortcuts
    this.slackApp.shortcut('open_settings', this.handleOpenSettings.bind(this));

    console.log('[SlackInteractionController] Interaction handlers registered');
  }

  private async handleGetStarted({ ack, body, client }: any): Promise<void> {
    try {
      await ack();

      const userId = body.user.id;
      const teamId = body.team?.id || body.user.team_id;

      console.log(`Get started clicked by ${userId}`);

      // Get user info
      const slackUser = await this.getSlackUser(userId, teamId);
      if (!slackUser) {
        throw new Error('Failed to get user information');
      }

      // Ensure user exists in backend
      await this.ensureUserExists(slackUser);

      // Update home view with onboarding or settings
      await client.views.publish({
        user_id: userId,
        view: {
          type: 'home',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Welcome to Smart Notifications!* 🎉\n\nLet's get you set up with intelligent notification filtering.`
              }
            },
            {
              type: 'divider'
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Quick Setup:*\n\n1. Choose your notification level\n2. Set quiet hours (optional)\n3. Select channels to monitor\n\nYour preferences will be saved automatically.`
              }
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '🧪 Test Filtering'
                  },
                  action_id: 'test_open'
                },
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '📊 View Analytics'
                  },
                  action_id: 'analytics_open'
                }
              ]
            }
          ]
        }
      });

    } catch (error) {
      this.handleError(error as Error, 'handleGetStarted');
    }
  }

  

  private async handleSettingsAction({ ack, body, client }: any): Promise<void> {
    try {
      await ack();

      const actionId = body.actions[0].action_id;
      const userId = body.user.id;
      const teamId = body.team?.id || body.user.team_id;

      console.log(`Settings action: ${actionId} by ${userId}`);

      switch (actionId) {
        case 'settings_open':
          await this.openSettingsModal(client, body.trigger_id, userId, teamId);
          break;
        
        case 'settings_notification_level':
          await this.handleNotificationLevelChange(body, client, userId, teamId);
          break;

        case 'settings_quiet_hours_toggle':
          await this.handleQuietHoursToggle(body, client, userId, teamId);
          break;

        default:
          console.warn(`Unhandled settings action: ${actionId}`);
      }

    } catch (error) {
      this.handleError(error as Error, 'handleSettingsAction');
    }
  }

  private async handleTestAction({ ack, body, client }: any): Promise<void> {
    try {
      await ack();

      const actionId = body.actions[0].action_id;
      const userId = body.user.id;
      const teamId = body.team?.id || body.user.team_id;

      console.log(`Test action: ${actionId} by ${userId}`);

      switch (actionId) {
        case 'test_open':
          await this.openTestModal(client, body.trigger_id, userId, teamId);
          break;

        default:
          console.warn(`Unhandled test action: ${actionId}`);
      }

    } catch (error) {
      this.handleError(error as Error, 'handleTestAction');
    }
  }

  private async handleAnalyticsAction({ ack, body, client }: any): Promise<void> {
    try {
      await ack();

      const actionId = body.actions[0].action_id;
      const userId = body.user.id;
      const teamId = body.team?.id || body.user.team_id;

      console.log(`Analytics action: ${actionId} by ${userId}`);

      switch (actionId) {
        case 'analytics_open':
          await this.showAnalytics(client, userId, teamId);
          break;

        default:
          console.warn(`Unhandled analytics action: ${actionId}`);
      }

    } catch (error) {
      this.handleError(error as Error, 'handleAnalyticsAction');
    }
  }

  private async handleSettingsSubmission({ ack, body, view, client }: any): Promise<void> {
    try {
      await ack();

      const userId = body.user.id;
      const teamId = body.team?.id || body.user.team_id;
      const values = view.state.values;

      console.log(`Settings submitted by ${userId}`);

      // Extract form values
      const notificationLevel = values.notification_level?.notification_level_select?.selected_option?.value;
      const quietHoursEnabled = values.quiet_hours?.quiet_hours_toggle?.selected_options?.length > 0;
      const startTime = values.quiet_hours_time?.start_time_select?.selected_time;
      const endTime = values.quiet_hours_time?.end_time_select?.selected_time;

      // Build settings update
      const settingsUpdate = {
        notification_level: notificationLevel,
        quiet_hours: {
          enabled: quietHoursEnabled,
          start_time: startTime || '22:00',
          end_time: endTime || '08:00',
          timezone: 'UTC' // We'll improve timezone handling later
        }
      };

      // Update settings in backend
      await this.backendAPI.updateUserSettings(userId, teamId, settingsUpdate);

      // Send confirmation message
      await client.chat.postEphemeral({
        channel: userId,
        user: userId,
        text: '✅ Your notification settings have been updated successfully!'
      });

      console.log(`Settings updated for user ${userId}`);

    } catch (error) {
      this.handleError(error as Error, 'handleSettingsSubmission');
      
      // Show error to user
      await ack({
        response_action: 'errors',
        errors: {
          notification_level: 'Failed to save settings. Please try again.'
        }
      });
    }
  }

  private async handleTestSubmission({ ack, body, view, client }: any): Promise<void> {
    try {
      await ack();
  
      const userId = body.user.id;
      const teamId = body.team?.id || body.user.team_id;
      const values = view.state.values;
  
      const testMessage = values.test_message?.message_input?.value;
      const channelContext = values.channel_context?.channel_select?.selected_option?.value || 'general';
  
      if (!testMessage) {
        throw new Error('No test message provided');
      }
  
      console.log(`Testing message classification for user ${userId}`);
  
      // Show loading message first
      const testView = new TestMessageView();
      const loadingBlocks = testView.renderLoading();
      
      await client.chat.postEphemeral({
        channel: userId,
        user: userId,
        blocks: loadingBlocks
      });
  
      try {
        // Test the message classification
        const result = await this.backendAPI.testClassifyMessage(
          testMessage,
          userId,
          channelContext
        );
  
        // Show result
        const resultBlocks = testView.renderTestResult({
          message: testMessage,
          should_notify: result.should_notify,
          confidence: result.confidence,
          category: result.category,
          reasoning: result.reasoning,
          channel: channelContext
        });
  
        await client.chat.postEphemeral({
          channel: userId,
          user: userId,
          text: `Test result for: "${testMessage}"`,
          blocks: resultBlocks
        });
  
      } catch (classificationError) {
        console.error('Classification failed:', classificationError);
        
        // Show sample result for demo if backend fails
        const sampleResult = {
          message: testMessage,
          should_notify: testMessage.toLowerCase().includes('urgent') || testMessage.includes('?'),
          confidence: 85,
          category: testMessage.toLowerCase().includes('urgent') ? 'urgent' : 
                   testMessage.includes('?') ? 'question' : 'general',
          reasoning: `Sample AI analysis: This message ${testMessage.toLowerCase().includes('urgent') ? 'contains urgent keywords' : 'appears to be general conversation'}.`
        };
  
        const resultBlocks = testView.renderTestResult(sampleResult);
        
        await client.chat.postEphemeral({
          channel: userId,
          user: userId,
          text: `Demo result for: "${testMessage}"`,
          blocks: resultBlocks
        });
      }
  
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      // Show error to user
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `❌ Test failed: ${errorMessage}`
      });
      
      this.handleError(error as Error, 'handleTestSubmission');
    }
  }
  
  private async handleOpenSettings({ ack, body, client }: any): Promise<void> {
    try {
      await ack();
  
      const userId = body.user.id;
      const teamId = body.team?.id || body.user.team_id;
  
      console.log(`Opening settings for user: ${userId}`);
  
      // Get current settings
      let currentSettings = {};
      try {
        const backendUser = await this.backendAPI.getUser(userId, teamId);
        currentSettings = backendUser?.settings || {};
      } catch (error) {
        console.warn('Could not load settings, using defaults:', error);
        currentSettings = this.backendAPI.getDefaultUserSettings();
      }
  
      // Create and show settings modal
      const settingsView = new SettingsView();
      const modal = settingsView.renderModal(currentSettings);
  
      await client.views.open({
        trigger_id: body.trigger_id,
        view: modal
      });
  
    } catch (error) {
      this.handleError(error as Error, 'handleOpenSettings');
    }
  }
  

  // Helper methods for opening modals and views

  private async openSettingsModal(client: any, triggerId: string, userId: string, teamId: string): Promise<void> {
    try {
      // Get current user settings
      const backendUser = await this.backendAPI.getUser(userId, teamId);
      const settings = backendUser?.settings || this.backendAPI.getDefaultUserSettings();

      await client.views.open({
        trigger_id: triggerId,
        view: {
          type: 'modal',
          callback_id: 'settings_modal',
          title: {
            type: 'plain_text',
            text: 'Notification Settings'
          },
          submit: {
            type: 'plain_text',
            text: 'Save'
          },
          close: {
            type: 'plain_text',
            text: 'Cancel'
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*Configure your notification preferences*'
              }
            },
            {
              type: 'input',
              block_id: 'notification_level',
              element: {
                type: 'static_select',
                action_id: 'notification_level_select',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select notification level'
                },
                initial_option: {
                  text: {
                    type: 'plain_text',
                    text: this.getNotificationLevelText(settings.notification_level)
                  },
                  value: settings.notification_level
                },
                options: [
                  {
                    text: { type: 'plain_text', text: 'All messages' },
                    value: 'all'
                  },
                  {
                    text: { type: 'plain_text', text: 'Mentions only' },
                    value: 'mentions'
                  },
                  {
                    text: { type: 'plain_text', text: 'Important only' },
                    value: 'important'
                  },
                  {
                    text: { type: 'plain_text', text: 'None' },
                    value: 'none'
                  }
                ]
              },
              label: {
                type: 'plain_text',
                text: 'Notification Level'
              }
            },
            {
              type: 'input',
              block_id: 'quiet_hours',
              element: {
                type: 'checkboxes',
                action_id: 'quiet_hours_toggle',
                initial_options: settings.quiet_hours.enabled ? [
                  {
                    text: { type: 'plain_text', text: 'Enable quiet hours' },
                    value: 'enabled'
                  }
                ] : [],
                options: [
                  {
                    text: { type: 'plain_text', text: 'Enable quiet hours' },
                    value: 'enabled'
                  }
                ]
              },
              label: {
                type: 'plain_text',
                text: 'Quiet Hours'
              }
            }
          ]
        }
      });

    } catch (error) {
      this.handleError(error as Error, 'openSettingsModal');
    }
  }

  private async handleTestFilter({ ack, body, client }: any): Promise<void> {
    try {
      await ack();
  
      const userId = body.user.id;
      console.log(`Opening test filter for user: ${userId}`);
  
      // Create and show test modal
      const testView = new TestMessageView();
      const modal = testView.renderTestModal();
  
      await client.views.open({
        trigger_id: body.trigger_id,
        view: modal
      });
  
    } catch (error) {
      this.handleError(error as Error, 'handleTestFilter');
    }
  }

  private async openTestModal(client: any, triggerId: string, userId: string, teamId: string): Promise<void> {
    try {
      await client.views.open({
        trigger_id: triggerId,
        view: {
          type: 'modal',
          callback_id: 'test_modal',
          title: {
            type: 'plain_text',
            text: 'Test Message Filtering'
          },
          submit: {
            type: 'plain_text',
            text: 'Test'
          },
          close: {
            type: 'plain_text',
            text: 'Cancel'
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*Test how our AI would classify a message*'
              }
            },
            {
              type: 'input',
              block_id: 'test_message',
              element: {
                type: 'plain_text_input',
                action_id: 'test_message_input',
                multiline: true,
                placeholder: {
                  type: 'plain_text',
                  text: 'Enter a test message...'
                }
              },
              label: {
                type: 'plain_text',
                text: 'Test Message'
              }
            },
            {
              type: 'input',
              block_id: 'test_channel',
              element: {
                type: 'channels_select',
                action_id: 'test_channel_select',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select a channel context'
                }
              },
              label: {
                type: 'plain_text',
                text: 'Channel Context'
              }
            }
          ]
        }
      });

    } catch (error) {
      this.handleError(error as Error, 'openTestModal');
    }
  }

  private async showAnalytics(client: any, userId: string, teamId: string): Promise<void> {
    try {
      // Get analytics data
      const analytics = await this.backendAPI.getUserAnalytics(userId, teamId, 'week');

      // Update home view with analytics
      await client.views.publish({
        user_id: userId,
        view: {
          type: 'home',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*📊 Your Notification Analytics*'
              }
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Total Messages:*\n${analytics.metrics.total_messages}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Filtered Out:*\n${analytics.metrics.filtered_messages}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Notifications Sent:*\n${analytics.metrics.notifications_sent}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Filter Effectiveness:*\n${analytics.metrics.filter_effectiveness}%`
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
                    text: '← Back to Home'
                  },
                  action_id: 'get_started'
                }
              ]
            }
          ]
        }
      });

    } catch (error) {
      this.handleError(error as Error, 'showAnalytics');
      
      // Show error message
      await client.chat.postEphemeral({
        channel: userId,
        user: userId,
        text: '❌ Failed to load analytics. Please try again later.'
      });
    }
  }

  // Helper methods

  private async handleNotificationLevelChange(body: any, client: any, userId: string, teamId: string): Promise<void> {
    // This would handle real-time updates without modal submission
    // Implementation depends on your UX preferences
  }

  private async handleQuietHoursToggle(body: any, client: any, userId: string, teamId: string): Promise<void> {
    // This would handle real-time quiet hours toggle
    // Implementation depends on your UX preferences
  }

  private getNotificationLevelText(level: string): string {
    const levels: { [key: string]: string } = {
      'all': 'All messages',
      'mentions': 'Mentions only',
      'important': 'Important only',
      'none': 'None'
    };
    return levels[level] || 'Mentions only';
  }
}