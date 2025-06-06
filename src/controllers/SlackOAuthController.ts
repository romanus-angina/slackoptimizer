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
    // Single, simple home handler - NO conflicts
    this.slackApp.event('app_home_opened', async ({ event, client }) => {
      try {
        console.log(`🎯 ISOLATED HOME TEST - User: ${event.user}, Tab: ${event.tab}`);
        
        // Only handle home tab
        if (event.tab !== 'home') {
          console.log('Not home tab, skipping');
          return;
        }
        
        console.log('Publishing simple view...');
        
        // Publish the simplest possible home view
        const result = await client.views.publish({
          user_id: event.user,
          view: {
            type: 'home',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '🎉 *SUCCESS!* \n\nYour Smart Notifications app is working!'
                }
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: 'This is a simple test view to verify everything is connected properly.'
                }
              }
            ]
          }
        });
        
        console.log('✅ Simple view published successfully:', result.ok);
        
      } catch (error) {
        console.error('❌ Simple view error:', error);
      }
    });
  
    console.log('[SlackOAuthController] Simple handler registered');
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