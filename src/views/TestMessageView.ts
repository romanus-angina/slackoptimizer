import { BaseView } from './BaseView';

export class TestMessageView extends BaseView {
  
  // Test modal - this will wow the judges with live AI classification
  renderTestModal(): any {
    return {
      type: 'modal',
      callback_id: 'test_modal',
      title: {
        type: 'plain_text',
        text: '🧪 Test AI Filter'
      },
      submit: {
        type: 'plain_text',
        text: 'Test Message'
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
            text: '*See how our AI classifies messages in real-time!*\n\nType any message below and watch our smart filter decide whether you should be notified.'
          }
        },
        
        {
          type: 'divider'
        },
        
        // Message input
        {
          type: 'input',
          block_id: 'test_message',
          element: {
            type: 'plain_text_input',
            action_id: 'message_input',
            placeholder: {
              type: 'plain_text',
              text: 'Try: "Can someone help me with this urgent bug?" or "Anyone want coffee?"'
            },
            multiline: true,
            max_length: 500
          },
          label: {
            type: 'plain_text',
            text: 'Test Message'
          },
          hint: {
            type: 'plain_text',
            text: 'Enter any message to see how the AI would classify it'
          }
        },
        
        // Channel context (optional but adds realism)
        {
          type: 'input',
          block_id: 'channel_context',
          element: {
            type: 'static_select',
            action_id: 'channel_select',
            placeholder: {
              type: 'plain_text',
              text: 'Select channel type'
            },
            options: [
              {
                text: { type: 'plain_text', text: '💼 #general - Company announcements' },
                value: 'general'
              },
              {
                text: { type: 'plain_text', text: '🚨 #alerts - System alerts and monitoring' },
                value: 'alerts'
              },
              {
                text: { type: 'plain_text', text: '💬 #random - Casual conversation' },
                value: 'random'
              },
              {
                text: { type: 'plain_text', text: '🔧 #engineering - Technical discussions' },
                value: 'engineering'
              },
              {
                text: { type: 'plain_text', text: '📞 Direct Message - Personal message' },
                value: 'dm'
              }
            ]
          },
          label: {
            type: 'plain_text',
            text: 'Channel Context'
          },
          hint: {
            type: 'plain_text',
            text: 'Channel type affects AI classification'
          },
          optional: true
        },
        
        {
          type: 'divider'
        },
        
        // Quick test examples for judges to click
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*⚡ Quick Test Examples*\nClick any button to test with sample messages:'
          }
        },
        
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🚨 Urgent'
              },
              action_id: 'test_urgent',
              value: 'Production is down! Need immediate help debugging the payment system.'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '💬 Social'
              },
              action_id: 'test_social',
              value: 'Anyone want to grab lunch? There\'s a new taco place down the street!'
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
                text: '📋 Meeting'
              },
              action_id: 'test_meeting',
              value: 'Reminder: All-hands meeting tomorrow at 2 PM in the main conference room.'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '❓ Question'
              },
              action_id: 'test_question',
              value: 'Quick question - does anyone know the password for the WiFi guest network?'
            }
          ]
        }
      ]
    };
  }
  
  // Test result view - this is where the magic happens for demo
  renderTestResult(result: {
    message: string;
    should_notify: boolean;
    confidence: number;
    category: string;
    reasoning: string;
    channel?: string;
  }): any {
    const emoji = result.should_notify ? '✅' : '❌';
    const notifyText = result.should_notify ? 'WOULD NOTIFY' : 'WOULD FILTER';
    const confidenceColor = result.confidence > 80 ? '🟢' : result.confidence > 50 ? '🟡' : '🔴';
    
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🧪 AI Classification Result*`
        }
      },
      
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Original Message:*\n> ${result.message}`
        }
      },
      
      {
        type: 'divider'
      },
      
      // The key result - make it visually striking
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${notifyText}*`
        },
        fields: [
          {
            type: 'mrkdwn',
            text: `*Category:*\n${this.getCategoryEmoji(result.category)} ${result.category.toUpperCase()}`
          },
          {
            type: 'mrkdwn',
            text: `*Confidence:*\n${confidenceColor} ${result.confidence}%`
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
      
      // Action buttons for more tests
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🧪 Test Another'
            },
            action_id: 'test_another',
            style: 'primary'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '⚙️ Adjust Settings'
            },
            action_id: 'adjust_settings'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🏠 Back to Home'
            },
            action_id: 'back_home'
          }
        ]
      }
    ];
  }
  
  private getCategoryEmoji(category: string): string {
    const emojis: { [key: string]: string } = {
      'urgent': '🚨',
      'important': '⚠️',
      'mention': '📢',
      'question': '❓',
      'meeting': '📅',
      'social': '💬',
      'spam': '🗑️',
      'general': '💬'
    };
    return emojis[category.toLowerCase()] || '💬';
  }
  
  // Loading state while AI is thinking
  renderLoading(): any {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '🤖 *AI is analyzing your message...*\n\nThis usually takes just a moment!'
        }
      }
    ];
  }
  
  // Default render method
  render(): any {
    return {
      type: 'home',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Test view - use renderTestModal() instead'
          }
        }
      ]
    };
  }
}