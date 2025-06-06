import { BaseView } from './BaseView';
import { BlockKitView } from '../types/ui';

export class SettingsView extends BaseView {
  
  // Main settings modal
  renderModal(currentSettings?: {
    notification_level?: string;
    quiet_hours?: { enabled: boolean; start_time: string; end_time: string };
    keywords?: string[];
  }): any {
    
    const settings = currentSettings || {};
    const notificationLevel = settings.notification_level || 'mentions';
    const quietHours = settings.quiet_hours || { enabled: false, start_time: '22:00', end_time: '08:00' };
    
    return {
      type: 'modal',
      callback_id: 'settings_modal',
      title: {
        type: 'plain_text',
        text: 'Smart Notification Settings'
      },
      submit: {
        type: 'plain_text',
        text: 'Save Settings'
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
            text: '*Configure your AI-powered notification preferences*'
          }
        },
        
        {
          type: 'divider'
        },
        
        // Notification Level - the key setting for demo
        {
          type: 'input',
          block_id: 'notification_level',
          element: {
            type: 'static_select',
            action_id: 'level_select',
            placeholder: {
              type: 'plain_text',
              text: 'Choose notification level'
            },
            initial_option: {
              text: {
                type: 'plain_text',
                text: this.getLevelText(notificationLevel)
              },
              value: notificationLevel
            },
            options: [
              {
                text: {
                  type: 'plain_text',
                  text: '🔊 All Messages - Get notified for everything'
                },
                value: 'all'
              },
              {
                text: {
                  type: 'plain_text',
                  text: '📢 Mentions Only - Only when mentioned or in DMs'
                },
                value: 'mentions'
              },
              {
                text: {
                  type: 'plain_text',
                  text: '🎯 Important Only - AI decides what\'s important'
                },
                value: 'important'
              },
              {
                text: {
                  type: 'plain_text',
                  text: '🔇 None - Disable all notifications'
                },
                value: 'none'
              }
            ]
          },
          label: {
            type: 'plain_text',
            text: 'Notification Level'
          },
          hint: {
            type: 'plain_text',
            text: 'This controls how selective the AI filter will be'
          }
        },
        
        // Keywords - simple but effective for demo
        {
          type: 'input',
          block_id: 'keywords',
          element: {
            type: 'plain_text_input',
            action_id: 'keywords_input',
            placeholder: {
              type: 'plain_text',
              text: 'urgent, meeting, deadline, help'
            },
            initial_value: (settings.keywords || []).join(', '),
            multiline: false
          },
          label: {
            type: 'plain_text',
            text: 'Important Keywords'
          },
          hint: {
            type: 'plain_text',
            text: 'Comma-separated words that should always notify you'
          },
          optional: true
        },
        
        // Quiet Hours - simple toggle for demo
        {
          type: 'input',
          block_id: 'quiet_hours',
          element: {
            type: 'checkboxes',
            action_id: 'quiet_toggle',
            initial_options: quietHours.enabled ? [{
              text: { type: 'plain_text', text: 'Enable quiet hours' },
              value: 'enabled'
            }] : [],
            options: [{
              text: { type: 'plain_text', text: 'Enable quiet hours (22:00 - 08:00)' },
              value: 'enabled'
            }]
          },
          label: {
            type: 'plain_text',
            text: 'Quiet Hours'
          },
          hint: {
            type: 'plain_text',
            text: 'Suppress non-urgent notifications during these hours'
          },
          optional: true
        },
        
        {
          type: 'divider'
        },
        
        // Quick preset buttons for demo wow factor
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*⚡ Quick Presets*'
          }
        },
        
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '💼 Work Mode'
              },
              action_id: 'preset_work',
              value: 'work'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🏠 Personal Mode'
              },
              action_id: 'preset_personal',
              value: 'personal'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🎯 Focus Mode'
              },
              action_id: 'preset_focus',
              value: 'focus'
            }
          ]
        }
      ]
    };
  }
  
  // Helper method for display text
  private getLevelText(level: string): string {
    const levels: { [key: string]: string } = {
      'all': '🔊 All Messages',
      'mentions': '📢 Mentions Only',
      'important': '🎯 Important Only',
      'none': '🔇 None'
    };
    return levels[level] || '📢 Mentions Only';
  }
  
  // Settings success view - for after saving
  renderSuccess(): any {
    return {
      type: 'home',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '✅ *Settings Updated Successfully!*\n\nYour smart notification preferences have been saved and the AI filter is now using your new settings.'
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🏠 Back to Home'
              },
              action_id: 'back_to_home',
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🧪 Test Your Settings'
              },
              action_id: 'test_settings'
            }
          ]
        }
      ]
    };
  }
  
  // Not implemented yet placeholder
  render(): BlockKitView {
    return {
      type: 'home',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Settings view - use renderModal() instead'
          }
        }
      ]
    };
  }
}