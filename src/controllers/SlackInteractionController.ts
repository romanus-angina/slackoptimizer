import { ExpressReceiver, App as SlackApp } from '@slack/bolt';
import { BaseController } from './BaseController';
import { ActionPayload } from '../types/ui';
import { SettingsView } from '../views/SettingsView';
import { TestMessageView } from '../views/TestMessageView';
import { AppHomeView } from '../views/AppHomeView';

export class SlackInteractionController extends BaseController {
  constructor(slackApp: SlackApp, expressReceiver: ExpressReceiver) {
    super(slackApp, expressReceiver);
  }

  register(): void {
    // Settings handler - opens a simple modal
    this.slackApp.action('open_settings', async ({ ack, body, client }) => {
      await ack();
      
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'settings_modal',
          title: { type: 'plain_text', text: 'Settings' },
          submit: { type: 'plain_text', text: 'Save' },
          close: { type: 'plain_text', text: 'Cancel' },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*Configure your AI notification preferences*'
              }
            },
            {
              type: 'input',
              block_id: 'notification_level',
              element: {
                type: 'static_select',
                action_id: 'level_select',
                placeholder: { type: 'plain_text', text: 'Choose level' },
                options: [
                  { text: { type: 'plain_text', text: '🔊 All Messages' }, value: 'all' },
                  { text: { type: 'plain_text', text: '📢 Mentions Only' }, value: 'mentions' },
                  { text: { type: 'plain_text', text: '🎯 Important Only' }, value: 'important' }
                ]
              },
              label: { type: 'plain_text', text: 'Notification Level' }
            },
            {
              type: 'input',
              block_id: 'keywords',
              element: {
                type: 'plain_text_input',
                action_id: 'keywords_input',
                placeholder: { type: 'plain_text', text: 'urgent, meeting, deadline' }
              },
              label: { type: 'plain_text', text: 'Important Keywords' },
              optional: true
            }
          ]
        }
      });
    });
  
    // Test filter handler - opens test modal
    this.slackApp.action('test_filter', async ({ ack, body, client }) => {
      await ack();
      
      await client.views.open({
        trigger_id: body.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'test_modal',
          title: { type: 'plain_text', text: '🧪 Test AI Filter' },
          submit: { type: 'plain_text', text: 'Test Message' },
          close: { type: 'plain_text', text: 'Cancel' },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*See how our AI classifies messages in real-time!*'
              }
            },
            {
              type: 'input',
              block_id: 'test_message',
              element: {
                type: 'plain_text_input',
                action_id: 'message_input',
                multiline: true,
                placeholder: { type: 'plain_text', text: 'Try: "Can someone help with this urgent bug?" or "Anyone want coffee?"' }
              },
              label: { type: 'plain_text', text: 'Test Message' }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*⚡ Quick Examples:*'
              }
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '🚨 Urgent' },
                  action_id: 'test_urgent',
                  value: 'Production is down! Need immediate help.'
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '💬 Social' },
                  action_id: 'test_social',
                  value: 'Anyone want to grab lunch?'
                }
              ]
            }
          ]
        }
      });
    });
  
    // Analytics handler - shows analytics in home view
    this.slackApp.action('view_analytics', async ({ ack, body, client }) => {
      await ack();
      
      await client.views.publish({
        user_id: body.user.id,
        view: {
          type: 'home',
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: '📊 Your Analytics Dashboard' }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*Filter Performance (Last 7 Days)*'
              }
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: '*Total Messages:*\n247' },
                { type: 'mrkdwn', text: '*Filtered Out:*\n158 (64%)' },
                { type: 'mrkdwn', text: '*Important Notifications:*\n18' },
                { type: 'mrkdwn', text: '*Time Saved:*\n~2.1 hours' }
              ]
            },
            {
              type: 'divider'
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*📈 Top Filtered Channels*\n• #random - 45 messages filtered\n• #general - 38 messages filtered\n• #announcements - 22 messages filtered'
              }
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '← Back to Home' },
                  action_id: 'back_home',
                  style: 'primary'
                }
              ]
            }
          ]
        }
      });
    });
  
    // Back home handler - returns to main home view
    this.slackApp.action('back_home', async ({ ack, body, client }) => {
      await ack();
      
      // Get user name quickly
      let userName = 'there';
      try {
        const userInfo = await client.users.info({ user: body.user.id });
        userName = userInfo.user?.name || 'there';
      } catch (error) {
        console.warn('Could not fetch user name');
      }
      
      await client.views.publish({
        user_id: body.user.id,
        view: {
          type: 'home',
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: 'Smart Notifications' }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Hey ${userName}! 👋 Your AI-powered notification filter is working hard to reduce noise and boost your productivity.`
              }
            },
            {
              type: 'divider'
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: '*📊 Your Smart Filter Stats*' }
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: '*Messages Analyzed:*\n247' },
                { type: 'mrkdwn', text: '*Smart DMs Sent:*\n18' },
                { type: 'mrkdwn', text: '*Feed Updates:*\n89' },
                { type: 'mrkdwn', text: '*Filter Effectiveness:*\n87%' }
              ]
            },
            {
              type: 'divider'
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '🎛️ Settings' },
                  action_id: 'open_settings',
                  style: 'primary'
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '🧪 Test Filter' },
                  action_id: 'test_filter'
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '📈 Analytics' },
                  action_id: 'view_analytics'
                }
              ]
            }
          ]
        }
      });
    });
  
    // Modal submission handlers
    this.slackApp.view('settings_modal', async ({ ack, body, view }) => {
      await ack();
      console.log('Settings saved:', view.state.values);
      // Settings saved - could integrate with backend here
    });
  
    this.slackApp.view('test_modal', async ({ ack, body, view, client }) => {
        try {
          const messageText = view.state.values.test_message?.message_input?.value || '';
          
          if (!messageText.trim()) {
            // Show error in modal
            await ack({
              response_action: 'errors',
              errors: {
                test_message: 'Please enter a message to test!'
              }
            });
            return;
          }
      
          // Acknowledge the modal submission first
          await ack();
      
          console.log(`🧪 Testing message: "${messageText}"`);
      
          // Show loading state by updating the home view
          await client.views.publish({
            user_id: body.user.id,
            view: {
              type: 'home',
              blocks: [
                {
                  type: 'header',
                  text: { type: 'plain_text', text: '🧪 AI Classification Test' }
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: '*Testing Message:*\n> ' + messageText
                  }
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: '🤖 *AI is analyzing your message...*\n\nThis usually takes just a moment!'
                  }
                }
              ]
            }
          });
      
          // Use the real AI classification
          const result = await this.backendAPI.testClassifyMessage(
            messageText,
            body.user.id,
            'general'
          );
      
          console.log(`🎯 Test result: ${result.should_notify ? 'NOTIFY' : 'FILTER'} (${result.confidence}%)`);
      
          // Format the result with rich UI in home view
          const emoji = result.should_notify ? '✅' : '❌';
          const decision = result.should_notify ? 'WOULD NOTIFY' : 'WOULD FILTER';
          const confidenceColor = result.confidence > 80 ? '🟢' : result.confidence > 60 ? '🟡' : '🟠';
          
          const categoryEmojis: { [key: string]: string } = {
            'urgent': '🚨',
            'important': '⚠️',
            'mention': '📢',
            'question': '❓',
            'meeting': '📅',
            'social': '💬',
            'spam': '🗑️',
            'general': '💬'
          };
      
          // Show results in home view (no DM needed!)
          await client.views.publish({
            user_id: body.user.id,
            view: {
              type: 'home',
              blocks: [
                {
                  type: 'header',
                  text: { type: 'plain_text', text: '🧪 AI Classification Result' }
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*Original Message:*\n> ${messageText}`
                  }
                },
                {
                  type: 'divider'
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `${emoji} *${decision}*`
                  },
                  fields: [
                    {
                      type: 'mrkdwn',
                      text: `*Category:*\n${categoryEmojis[result.category] || '💬'} ${result.category.toUpperCase()}`
                    },
                    {
                      type: 'mrkdwn',
                      text: `*Confidence:*\n${confidenceColor} ${result.confidence}%`
                    },
                    {
                      type: 'mrkdwn',
                      text: `*Priority:*\n${result.priority.toUpperCase()}`
                    },
                    {
                      type: 'mrkdwn',
                      text: `*Tags:*\n${result.tags.length > 0 ? result.tags.join(', ') : 'none'}`
                    }
                  ]
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*🤖 AI Reasoning:*\n${result.reasoning}`
                  }
                },
                {
                  type: 'divider'
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: '*💡 What this means:*\n' + (result.should_notify 
                      ? 'This message would trigger a smart notification DM to you.'
                      : 'This message would be filtered and only appear in your feed.')
                  }
                },
                {
                  type: 'actions',
                  elements: [
                    {
                      type: 'button',
                      text: { type: 'plain_text', text: '🧪 Test Another Message' },
                      action_id: 'test_filter',
                      style: 'primary'
                    },
                    {
                      type: 'button',
                      text: { type: 'plain_text', text: '⚙️ Adjust Settings' },
                      action_id: 'open_settings'
                    },
                    {
                      type: 'button',
                      text: { type: 'plain_text', text: '🏠 Back to Home' },
                      action_id: 'back_home'
                    }
                  ]
                }
              ]
            }
          });
      
        } catch (error) {
          console.error('❌ Test classification error:', error);
          
          // Show error in home view
          await client.views.publish({
            user_id: body.user.id,
            view: {
              type: 'home',
              blocks: [
                {
                  type: 'header',
                  text: { type: 'plain_text', text: '❌ Test Failed' }
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*Error:* ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or check the backend connection.`
                  }
                },
                {
                  type: 'actions',
                  elements: [
                    {
                      type: 'button',
                      text: { type: 'plain_text', text: '🔄 Try Again' },
                      action_id: 'test_filter'
                    },
                    {
                      type: 'button',
                      text: { type: 'plain_text', text: '🏠 Back to Home' },
                      action_id: 'back_home'
                    }
                  ]
                }
              ]
            }
          });
        }
      });
  
    console.log('[SlackInteractionController] All action handlers registered');
  }

  // === CORE NAVIGATION HANDLERS ===

  private async handleOpenSettings({ ack, body, client }: any): Promise<void> {
    try {
      await ack();
      
      const userId = body.user.id;
      const teamId = body.team?.id || body.user.team_id;
      
      console.log(`Opening settings for user: ${userId}`);
      
      // Get current settings from backend
      let currentSettings = {};
      try {
        const backendUser = await this.backendAPI.getUser(userId, teamId);
        currentSettings = backendUser?.settings || {};
      } catch (error) {
        console.warn('Could not load current settings, using defaults:', error);
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
      
      // Show error message to user
      await this.respondToInteraction(
        async (msg: any) => await client.chat.postEphemeral({
          channel: body.user.id,
          user: body.user.id,
          text: msg.text
        }),
        '❌ Failed to open settings. Please try again.',
        true
      );
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
      
      await this.respondToInteraction(
        async (msg: any) => await client.chat.postEphemeral({
          channel: body.user.id,
          user: body.user.id,
          text: msg.text
        }),
        '❌ Failed to open test modal. Please try again.',
        true
      );
    }
  }

  private async handleViewAnalytics({ ack, body, client }: any): Promise<void> {
    try {
      await ack();
      
      const userId = body.user.id;
      const teamId = body.team?.id || body.user.team_id;
      
      console.log(`Viewing analytics for user: ${userId}`);
      
      // Show analytics in home view
      await this.showAnalytics(client, userId, teamId);
      
    } catch (error) {
      this.handleError(error as Error, 'handleViewAnalytics');
      
      await this.respondToInteraction(
        async (msg: any) => await client.chat.postEphemeral({
          channel: body.user.id,
          user: body.user.id,
          text: msg.text
        }),
        '❌ Failed to load analytics. Please try again.',
        true
      );
    }
  }

  private async handleBackHome({ ack, body, client }: any): Promise<void> {
    try {
      await ack();
      
      const userId = body.user.id;
      const teamId = body.team?.id || body.user.team_id;
      
      console.log(`Returning to home for user: ${userId}`);
      
      // Get user info and refresh home view
      const slackUser = await this.getSlackUser(userId, teamId);
      if (!slackUser) {
        throw new Error('Failed to get user information');
      }
      
      // Create fresh home view
      const homeView = new AppHomeView();
      
      try {
        // Try to get real analytics data
        const analytics = await this.backendAPI.getUserAnalytics(userId, teamId, 'week');
        
        const viewData = {
          user: { name: slackUser.name, id: userId },
          stats: {
            messages_filtered: analytics.metrics.filtered_messages || 0,
            notifications_sent: analytics.metrics.notifications_sent || 0,
            filter_effectiveness: analytics.metrics.filter_effectiveness || 0
          },
          recent_activity: [] // Could add recent activity here
        };
        
        const view = homeView.render(viewData);
        
        await client.views.publish({
          user_id: userId,
          view
        });
        
      } catch (backendError) {
        // Fallback to sample data if backend unavailable
        console.warn('Backend unavailable, showing sample data for home view');
        
        const sampleData = {
          user: { name: slackUser.name, id: userId },
          stats: {
            messages_filtered: 127,
            notifications_sent: 23,
            filter_effectiveness: 82
          },
          recent_activity: []
        };
        
        const view = homeView.render(sampleData);
        
        await client.views.publish({
          user_id: userId,
          view
        });
      }
      
    } catch (error) {
      this.handleError(error as Error, 'handleBackHome');
      
      // Show minimal error home view
      const homeView = new AppHomeView();
      const errorView = homeView.renderError('Failed to load home view');
      
      await client.views.publish({
        user_id: body.user.id,
        view: errorView
      });
    }
  }

  // === TEST-SPECIFIC HANDLERS ===

  private async handleTestAnother({ ack, body, client }: any): Promise<void> {
    try {
      await ack();
      
      console.log(`Opening another test for user: ${body.user.id}`);
      
      // Simply open the test modal again
      const testView = new TestMessageView();
      const modal = testView.renderTestModal();
      
      await client.views.open({
        trigger_id: body.trigger_id,
        view: modal
      });
      
    } catch (error) {
      this.handleError(error as Error, 'handleTestAnother');
      
      await this.respondToInteraction(
        async (msg: any) => await client.chat.postEphemeral({
          channel: body.user.id,
          user: body.user.id,
          text: msg.text
        }),
        '❌ Failed to open test modal. Please try again.',
        true
      );
    }
  }

  private async handleAdjustSettings({ ack, body, client }: any): Promise<void> {
    try {
      await ack();
      
      console.log(`Adjusting settings from test view for user: ${body.user.id}`);
      
      // This is a shortcut from test results to settings
      // Reuse the open settings logic
      await this.handleOpenSettings({ ack: () => {}, body, client });
      
    } catch (error) {
      this.handleError(error as Error, 'handleAdjustSettings');
      
      await this.respondToInteraction(
        async (msg: any) => await client.chat.postEphemeral({
          channel: body.user.id,
          user: body.user.id,
          text: msg.text
        }),
        '❌ Failed to open settings. Please try again.',
        true
      );
    }
  }

  // === EXISTING HANDLERS (keeping your current implementation) ===

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
                  action_id: 'test_filter'
                },
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '📊 View Analytics'
                  },
                  action_id: 'view_analytics'
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
      const notificationLevel = values.notification_level?.level_select?.selected_option?.value;
      const quietHoursEnabled = values.quiet_hours?.quiet_toggle?.selected_options?.length > 0;
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
  
  private async handleOpenSettingsShortcut({ ack, body, client }: any): Promise<void> {
    try {
      await ack();
  
      const userId = body.user.id;
      const teamId = body.team?.id || body.user.team_id;
  
      console.log(`Opening settings shortcut for user: ${userId}`);
  
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
      this.handleError(error as Error, 'handleOpenSettingsShortcut');
    }
  }

  // === HELPER METHODS ===

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
                action_id: 'message_input',
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
              block_id: 'channel_context',
              element: {
                type: 'static_select',
                action_id: 'channel_select',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select a channel context'
                },
                options: [
                  {
                    text: { type: 'plain_text', text: 'General' },
                    value: 'general'
                  },
                  {
                    text: { type: 'plain_text', text: 'Engineering' },
                    value: 'engineering'
                  },
                  {
                    text: { type: 'plain_text', text: 'Random' },
                    value: 'random'
                  }
                ]
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
                  action_id: 'back_home'
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