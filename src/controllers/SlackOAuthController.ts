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
    // IMPORTANT: Register OAuth callback on the main Express app, not the receiver router
    // The ExpressReceiver already handles OAuth, but we want custom success/error pages
    
    // Handle installation success
    this.slackApp.event('app_home_opened', this.handleAppHomeOpened.bind(this));

    console.log('[SlackOAuthController] OAuth routes registered');
  }

  private async handleAppHomeOpened({ event, client }: any): Promise<void> {
    try {
      const { user, tab } = event;
  
      // Only handle the 'home' tab
      if (tab !== 'home') {
        return;
      }
  
      console.log(`App home opened by user: ${user}`);
  
      // Get user info
      const slackUser = await this.getSlackUser(user, event.team || '');
      if (!slackUser) {
        throw new Error('Failed to get user information');
      }
  
      // Create view instance
      const homeView = new AppHomeView();
  
      try {
        // Try to get real data from backend
        const backendUser = await this.backendAPI.getUser(user, event.team);
        if (!backendUser) {
          // Create user if doesn't exist
          try {
            await this.backendAPI.createUser({
              slack_user_id: user,
              team_id: event.team || '',
              email: slackUser.email || `${user}@slack.local`
            });
          } catch (createError) {
            console.warn('Failed to create user, using default settings:', createError);
          }
        }
  
        // Try to get analytics
        const analytics = await this.backendAPI.getUserAnalytics(user, event.team, 'week');
        
        const viewData = {
          user: { name: slackUser.name, id: user },
          stats: {
            messages_filtered: analytics.metrics.filtered_messages || 0,
            notifications_sent: analytics.metrics.notifications_sent || 0,
            filter_effectiveness: analytics.metrics.filter_effectiveness || 0
          },
          recent_activity: []
        };
  
        // Publish view
        await client.views.publish({
          user_id: user,
          view: homeView.render(viewData)
        });
  
      } catch (backendError) {
        console.warn('Backend unavailable, showing sample data:', backendError);
        
        // Use sample data as fallback
        const sampleData = {
          user: { name: slackUser.name, id: user },
          stats: {
            messages_filtered: 0,
            notifications_sent: 0,
            filter_effectiveness: 100
          },
          recent_activity: []
        };
  
        // Publish view with sample data
        await client.views.publish({
          user_id: user,
          view: homeView.render(sampleData)
        });
      }
  
    } catch (error) {
      console.error('[SlackOAuthController] Error in handleAppHomeOpened:', error);
      
      // Show error view
      const homeView = new AppHomeView();
      const errorView = homeView.renderError('Failed to load home view. Please try again.');
      
      try {
        await client.views.publish({
          user_id: event.user,
          view: errorView
        });
      } catch (viewError) {
        console.error('Failed to show error view:', viewError);
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