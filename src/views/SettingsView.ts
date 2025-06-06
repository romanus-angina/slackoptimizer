import { BaseView } from './BaseView';
import { BlockKitView } from '../types/ui';

export class SettingsView extends BaseView {
  
    renderModal(currentSettings?: {
      notification_level?: string;
      quiet_hours?: { enabled: boolean; start_time: string; end_time: string };
      keywords?: string[];
      delivery_preferences?: {
        urgent_via_dm: boolean;
        important_via_dm: boolean;
        mentions_via_dm: boolean;
        feed_enabled: boolean;
      };
    }): any {
      
      const settings = currentSettings || {};
      const delivery = settings.delivery_preferences || {
        urgent_via_dm: true,
        important_via_dm: true, 
        mentions_via_dm: false,
        feed_enabled: true
      };
      
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
          
          // Notification Level (existing)
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
                  text: this.getLevelText(settings.notification_level || 'mentions')
                },
                value: settings.notification_level || 'mentions'
              },
              options: [
                {
                  text: { type: 'plain_text', text: '🔊 All Messages' },
                  value: 'all'
                },
                {
                  text: { type: 'plain_text', text: '📢 Mentions Only' },
                  value: 'mentions'
                },
                {
                  text: { type: 'plain_text', text: '🎯 Important Only' },
                  value: 'important'
                },
                {
                  text: { type: 'plain_text', text: '🔇 None' },
                  value: 'none'
                }
              ]
            },
            label: {
              type: 'plain_text',
              text: 'Notification Level'
            }
          },
  
          // NEW: Delivery Method Configuration
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*📬 How do you want to receive notifications?*'
            }
          },
  
          {
            type: 'input',
            block_id: 'dm_delivery',
            element: {
              type: 'checkboxes',
              action_id: 'dm_options',
              initial_options: this.buildDMCheckboxes(delivery),
              options: [
                {
                  text: { type: 'plain_text', text: '🚨 Send urgent messages as DMs (immediate notification)' },
                  value: 'urgent_via_dm'
                },
                {
                  text: { type: 'plain_text', text: '⚠️ Send important messages as DMs' },
                  value: 'important_via_dm'
                },
                {
                  text: { type: 'plain_text', text: '📢 Send mentions as DMs' },
                  value: 'mentions_via_dm'
                }
              ]
            },
            label: {
              type: 'plain_text',
              text: 'Direct Message Notifications'
            },
            hint: {
              type: 'plain_text',
              text: 'These will appear as immediate Slack notifications from our bot'
            },
            optional: true
          },
  
          {
            type: 'input',
            block_id: 'feed_delivery',
            element: {
              type: 'checkboxes',
              action_id: 'feed_options',
              initial_options: delivery.feed_enabled ? [
                { text: { type: 'plain_text', text: 'Enable smart notification feed' }, value: 'feed_enabled' }
              ] : [],
              options: [
                {
                  text: { type: 'plain_text', text: '📱 Enable smart notification feed in app' },
                  value: 'feed_enabled'
                }
              ]
            },
            label: {
              type: 'plain_text',
              text: 'In-App Feed'
            },
            hint: {
              type: 'plain_text',
              text: 'View all filtered messages in your app dashboard'
            },
            optional: true
          },
  
          {
            type: 'divider'
          },
  
          // Keywords (existing)
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
            optional: true
          },
  
          // Quiet Hours (existing)
          {
            type: 'input',
            block_id: 'quiet_hours',
            element: {
              type: 'checkboxes',
              action_id: 'quiet_toggle',
              initial_options: (settings.quiet_hours?.enabled) ? [{
                text: { type: 'plain_text', text: 'Enable quiet hours (22:00 - 08:00)' },
                value: 'enabled'
              }] : [],
              options: [{
                text: { type: 'plain_text', text: 'Enable quiet hours (affects DMs only)' },
                value: 'enabled'
              }]
            },
            label: {
              type: 'plain_text',
              text: 'Quiet Hours'
            },
            hint: {
              type: 'plain_text',
              text: 'Suppress DM notifications during these hours (feed still updates)'
            },
            optional: true
          },
  
          {
            type: 'divider'
          },
  
          // Preset buttons with delivery examples
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
  
    // Helper to build DM checkbox initial state
    private buildDMCheckboxes(delivery: any): any[] {
      const options = [];
      
      if (delivery.urgent_via_dm) {
        options.push({ text: { type: 'plain_text', text: '🚨 Send urgent messages as DMs' }, value: 'urgent_via_dm' });
      }
      if (delivery.important_via_dm) {
        options.push({ text: { type: 'plain_text', text: '⚠️ Send important messages as DMs' }, value: 'important_via_dm' });
      }
      if (delivery.mentions_via_dm) {
        options.push({ text: { type: 'plain_text', text: '📢 Send mentions as DMs' }, value: 'mentions_via_dm' });
      }
      
      return options;
    }
  
    // Helper for preset configurations
    static getPresetConfig(preset: string): any {
      type PresetConfig = {
        notification_level: string;
        delivery_preferences: {
          urgent_via_dm: boolean;
          important_via_dm: boolean;
          mentions_via_dm: boolean;
          feed_enabled: boolean;
        };
        quiet_hours: {
          enabled: boolean;
          start_time?: string;
          end_time?: string;
        };
      };

      type Presets = {
        work: PresetConfig;
        personal: PresetConfig;
        focus: PresetConfig;
        [key: string]: PresetConfig;
      };

      const presets: Presets = {
        work: {
          notification_level: 'important',
          delivery_preferences: {
            urgent_via_dm: true,
            important_via_dm: true,
            mentions_via_dm: false,
            feed_enabled: true
          },
          quiet_hours: { enabled: true, start_time: '18:00', end_time: '09:00' }
        },
        personal: {
          notification_level: 'mentions',
          delivery_preferences: {
            urgent_via_dm: true,
            important_via_dm: false,
            mentions_via_dm: true,
            feed_enabled: true
          },
          quiet_hours: { enabled: true, start_time: '22:00', end_time: '08:00' }
        },
        focus: {
          notification_level: 'none',
          delivery_preferences: {
            urgent_via_dm: true,
            important_via_dm: false,
            mentions_via_dm: false,
            feed_enabled: true
          },
          quiet_hours: { enabled: false }
        }
      };
      
      return presets[preset] || presets.work;
    }
  
    private getLevelText(level: string): string {
      const levels: { [key: string]: string } = {
        'all': '🔊 All Messages',
        'mentions': '📢 Mentions Only',
        'important': '🎯 Important Only',
        'none': '🔇 None'
      };
      return levels[level] || '📢 Mentions Only';
    }
  
    render(): any {
      return { type: 'home', blocks: [] };
    }
  }