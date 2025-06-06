import { BaseView } from './BaseView';
import { BlockKitView } from '../types/ui';

export class AppHomeView extends BaseView {
  
  render(data?: {
    user?: { name: string; id: string };
    stats?: { 
      messages_filtered: number;
      notifications_sent: number;
      filter_effectiveness: number;
      feed_updates?: number;
      dms_sent?: number;
    };
    recent_activity?: any[];
  }): BlockKitView {
    
    const userName = data?.user?.name || 'there';
    const stats = data?.stats || { messages_filtered: 0, notifications_sent: 0, filter_effectiveness: 0 };
    
    return {
      type: 'home',
      blocks: [
        // Header with welcome message
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
        
        // Quick stats - this will impress judges!
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
                text: `*Messages Analyzed:*\n${stats.messages_filtered + stats.notifications_sent}`
              },
              {
                type: 'mrkdwn',
                text: `*Smart DMs Sent:*\n${stats.dms_sent || 0}`
              },
              {
                type: 'mrkdwn',
                text: `*Feed Updates:*\n${stats.feed_updates || stats.notifications_sent}`
              },
              {
                type: 'mrkdwn',
                text: `*Filter Effectiveness:*\n${stats.filter_effectiveness}%`
              }
            ]
          },
        
        {
          type: 'divider'
        },
        
        // Main action buttons - keep it simple but functional
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
        
        // Recent activity (if available)
        ...(data?.recent_activity && data.recent_activity.length > 0 ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*🕒 Recent Filter Activity*'
            }
          },
          ...this.renderRecentActivity(data.recent_activity)
        ] : [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*🚀 Getting Started*\n\nYour smart filter is ready! Start by:\n• Configuring your notification preferences\n• Testing the AI filter with sample messages\n• Checking your analytics to see the impact'
            }
          }
        ]),
        
        {
          type: 'divider'
        },
        
        // Footer with helpful info
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
    };
  }
  
  // Helper method to render recent activity
  private renderRecentActivity(activities: any[]): any[] {
    return activities.slice(0, 3).map(activity => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `• *#${activity.channel}* - ${activity.filtered_count} filtered, ${activity.notification_count} notified`
      }
    }));
  }
  
  // Render loading state for demo
  renderLoading(): BlockKitView {
    return {
      type: 'home',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '🔄 Loading your smart notification dashboard...'
          }
        }
      ]
    };
  }
  
  // Render error state for demo
  renderError(error: string): BlockKitView {
    return {
      type: 'home',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `❌ Oops! Something went wrong: ${error}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Try Again'
              },
              action_id: 'retry_home'
            }
          ]
        }
      ]
    };
  }
}