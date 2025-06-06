import { App as SlackApp, ExpressReceiver } from '@slack/bolt';
import { BaseController } from './BaseController';
import { slackConfig } from '../config/slack';
import { AppHomeView } from '../views/AppHomeView';
import { viewState, ViewHelpers } from '../utils/viewState';

export class SlackOAuthController extends BaseController {
  constructor(slackApp: SlackApp, expressReceiver: ExpressReceiver) {
    super(slackApp, expressReceiver);
  }

  register(): void {
    this.slackApp.event('app_home_opened', async ({ event, client }) => {
      try {
        console.log(`🏠 Home opened - User: ${event.user}, Tab: ${event.tab}`);
        
        if (event.tab !== 'home') {
          return;
        }
        
        // Get user name (simple approach - no complex API calls)
        let userName = 'there';
        try {
          const userInfo = await client.users.info({ user: event.user });
          userName = userInfo.user?.name || userInfo.user?.real_name || 'there';
        } catch (error) {
          console.warn('Could not fetch user name, using default');
        }
        
        console.log('Publishing full home view...');
        
        const result = await client.views.publish({
          user_id: event.user,
          view: {
            type: 'home',
            blocks: [
              // Header
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: 'Smart Notifications'
                }
              },
              
              // Welcome section
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
              
              // Stats section
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*📊 Your Smart Filter Stats*'
                }
              },
              
              {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: '*Messages Analyzed:*\n247'
                  },
                  {
                    type: 'mrkdwn',
                    text: '*Smart DMs Sent:*\n18'
                  },
                  {
                    type: 'mrkdwn',
                    text: '*Feed Updates:*\n89'
                  },
                  {
                    type: 'mrkdwn',
                    text: '*Filter Effectiveness:*\n87%'
                  }
                ]
              },
              
              {
                type: 'divider'
              },
              
              // Main action buttons
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*⚙️ Quick Actions*'
                }
              },
              
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: '🎛️ Settings'
                    },
                    action_id: 'open_settings',
                    style: 'primary'
                  },
                  {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: '🧪 Test Filter'
                    },
                    action_id: 'test_filter'
                  },
                  {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: '📈 Analytics'
                    },
                    action_id: 'view_analytics'
                  }
                ]
              },
              
              {
                type: 'divider'
              },
              
              // Recent activity section
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*🕒 Recent Filter Activity*'
                }
              },
              
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '• *#general* - 15 filtered, 3 notified\n• *#engineering* - 8 filtered, 2 notified\n• *#random* - 22 filtered, 1 notified'
                }
              },
              
              {
                type: 'divider'
              },
              
              // Getting started section
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '*🚀 Getting Started*\n\nYour smart filter is ready! Start by:\n• Configuring your notification preferences\n• Testing the AI filter with sample messages\n• Checking your analytics to see the impact'
                }
              },
              
              // Footer
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: 'ℹ️ Smart Notifications uses AI to filter your Slack messages based on importance, keywords, and your preferences.'
                  }
                ]
              }
            ]
          }
        });
        
        console.log('✅ Full home view published successfully:', result.ok);
        
      } catch (error) {
        console.error('❌ Full home view error:', error);
        
        // Fallback to simple view if full view fails
        try {
          await client.views.publish({
            user_id: event.user,
            view: {
              type: 'home',
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: '⚠️ *Smart Notifications*\n\nThere was an issue loading your full dashboard. The app is working, but showing a simplified view.'
                  }
                },
                {
                  type: 'actions',
                  elements: [
                    {
                      type: 'button',
                      text: {
                        type: 'plain_text',
                        text: '🔄 Try Again'
                      },
                      action_id: 'refresh_home'
                    }
                  ]
                }
              ]
            }
          });
        } catch (fallbackError) {
          console.error('Even fallback view failed:', fallbackError);
        }
      }
    });
  
    console.log('[SlackOAuthController] Full home handler registered');
  }
  

  private async handleAppHomeOpened({ event, client }: any): Promise<void> {
    try {
      const { user, tab } = event;
  
      // Only handle the 'home' tab
      if (tab !== 'home') {
        return;
      }
  
      console.log(`App home opened by user: ${user}`);
  
      // FIXED: Get team ID from event properly
      const teamId = event.team || event.team_id || '';
      console.log(`Team ID: ${teamId}`);
      
      // Get user info
      const slackUser = await this.getSlackUser(user, teamId);
      if (!slackUser) {
        console.error('Failed to get user information, showing fallback view');
        // Show a basic fallback view instead of failing completely
        await client.views.publish({
          user_id: user,
          view: {
            type: 'home',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '👋 Welcome to Smart Notifications!\n\nSetting up your account...'
                }
              }
            ]
          }
        });
        return;
      }
  
      // Try to ensure user exists in backend (but don't fail if it doesn't work)
      try {
        await this.ensureUserExists(slackUser);
      } catch (error) {
        console.warn('Backend user creation failed, continuing with sample data:', error);
      }
  
      // Create view instance
      const homeView = new AppHomeView();
  
      try {
        // Try to get real data from backend
        const analytics = await this.backendAPI.getUserAnalytics(user, teamId, 'week');
        const recentActivity = ViewHelpers.generateSampleActivity();
  
        const viewData = {
          user: { name: slackUser.name, id: user },
          stats: {
            messages_filtered: analytics.metrics.filtered_messages || 0,
            notifications_sent: analytics.metrics.notifications_sent || 0,
            filter_effectiveness: analytics.metrics.filter_effectiveness || 0
          },
          recent_activity: recentActivity
        };
  
        const view = homeView.render(viewData);
  
        await client.views.publish({
          user_id: user,
          view
        });
  
        console.log('✅ Home view published successfully with backend data');
  
      } catch (backendError) {
        // If backend fails, show sample data for demo
        console.warn('Backend unavailable, showing sample data:', backendError);
        
        const sampleData = {
          user: { name: slackUser.name, id: user },
          stats: ViewHelpers.generateSampleStats(),
          recent_activity: ViewHelpers.generateSampleActivity()
        };
  
        const view = homeView.render(sampleData);
        
        await client.views.publish({
          user_id: user,
          view
        });
        
        console.log('✅ Home view published successfully with sample data');
      }
  
    } catch (error) {
      this.handleError(error as Error, 'handleAppHomeOpened');
      
      // Show minimal error view as last resort
      try {
        await client.views.publish({
          user_id: event.user,
          view: {
            type: 'home',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '❌ Something went wrong loading your dashboard.\n\nPlease try refreshing or contact support.'
                }
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: '🔄 Refresh'
                    },
                    action_id: 'refresh_home'
                  }
                ]
              }
            ]
          }
        });
      } catch (publishError) {
        console.error('Failed to publish error view:', publishError);
      }
    }
  }

  // Helper method to generate OAuth install URL
  public getInstallUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: slackConfig.clientId,
      scope: slackConfig.scopes.join(','),
      redirect_uri: slackConfig.redirectUri, // Use the full redirect URI
      response_type: 'code'
    });

    if (state) {
      params.append('state', state);
    }

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }
}