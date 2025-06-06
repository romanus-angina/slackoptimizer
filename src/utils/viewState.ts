// Simple state management for hackathon demo - no over-engineering!

export interface ViewState {
    loading: boolean;
    error?: string;
    data?: any;
    user?: {
      id: string;
      name: string;
      team_id: string;
    };
}

class ViewStateManager {
    private states: Map<string, ViewState> = new Map();
    
    // Get state for a user
    getState(userId: string): ViewState {
      return this.states.get(userId) || {
        loading: false,
        data: null
      };
    }
    
    // Set loading state
    setLoading(userId: string, loading: boolean): void {
      const current = this.getState(userId);
      this.states.set(userId, {
        ...current,
        loading,
        error: loading ? undefined : current.error // Clear error when loading starts
      });
    }
    
    // Set error state
    setError(userId: string, error: string): void {
      const current = this.getState(userId);
      this.states.set(userId, {
        ...current,
        loading: false,
        error
      });
    }
    
    // Set data state
    setData(userId: string, data: any): void {
      const current = this.getState(userId);
      this.states.set(userId, {
        ...current,
        loading: false,
        error: undefined,
        data
      });
    }
    
    // Set user info
    setUser(userId: string, user: any): void {
      const current = this.getState(userId);
      this.states.set(userId, {
        ...current,
        user
      });
    }
    
    // Clear state (for demo reset)
    clear(userId: string): void {
      this.states.delete(userId);
    }
    
    // Clear all states
    clearAll(): void {
      this.states.clear();
    }
}

// Helper functions for common view operations
class ViewHelpersClass {
    // Format numbers for display
    static formatNumber(num: number): string {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      }
      if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
      }
      return num.toString();
    }
    
    // Format percentage
    static formatPercentage(num: number): string {
      return `${Math.round(num)}%`;
    }
    
    // Get relative time (simplified)
    static getRelativeTime(date: string | Date): string {
      const now = new Date();
      const target = new Date(date);
      const diffMs = now.getTime() - target.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
    
    // Truncate text for display
    static truncateText(text: string, maxLength: number): string {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength - 3) + '...';
    }
    
    // Get emoji for category
    static getCategoryEmoji(category: string): string {
      const emojis: { [key: string]: string } = {
        'urgent': '🚨',
        'important': '⚠️',
        'mention': '📢',
        'question': '❓',
        'meeting': '📅',
        'social': '💬',
        'spam': '🗑️',
        'general': '💬',
        'announcement': '📣',
        'file': '📎'
      };
      return emojis[category.toLowerCase()] || '💬';
    }
    
    // Get color for confidence level
    static getConfidenceColor(confidence: number): string {
      if (confidence >= 80) return '🟢';
      if (confidence >= 60) return '🟡';
      if (confidence >= 40) return '🟠';
      return '🔴';
    }
    
    // Generate sample data for demo
    static generateSampleStats(): any {
      return {
        messages_filtered: Math.floor(Math.random() * 500) + 100,
        notifications_sent: Math.floor(Math.random() * 100) + 20,
        filter_effectiveness: Math.floor(Math.random() * 30) + 70, // 70-100%
        channels_active: Math.floor(Math.random() * 10) + 5
      };
    }
    
    // Generate sample recent activity
    static generateSampleActivity(): any[] {
      const channels = ['general', 'engineering', 'random', 'alerts', 'marketing'];
      return channels.slice(0, 3).map(channel => ({
        channel,
        filtered_count: Math.floor(Math.random() * 20) + 5,
        notification_count: Math.floor(Math.random() * 8) + 1,
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString() // Last hour
      }));
    }
}

// Block Kit composition helpers
class BlockKitHelpersClass {
    // Create a header block
    static header(text: string): any {
      return {
        type: 'header',
        text: {
          type: 'plain_text',
          text
        }
      };
    }
    
    // Create a section with markdown
    static section(text: string, accessory?: any): any {
      const block: any = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text
        }
      };
      
      if (accessory) {
        block.accessory = accessory;
      }
      
      return block;
    }
    
    // Create action buttons
    static actions(buttons: Array<{
      text: string;
      action_id: string;
      value?: string;
      style?: 'primary' | 'danger';
      url?: string;
    }>): any {
      return {
        type: 'actions',
        elements: buttons.map(btn => {
          const element: any = {
            type: 'button',
            text: {
              type: 'plain_text',
              text: btn.text
            },
            action_id: btn.action_id
          };
          
          if (btn.value) element.value = btn.value;
          if (btn.style) element.style = btn.style;
          if (btn.url) element.url = btn.url;
          
          return element;
        })
      };
    }
    
    // Create divider
    static divider(): any {
      return { type: 'divider' };
    }
    
    // Create context (small text)
    static context(texts: string[]): any {
      return {
        type: 'context',
        elements: texts.map(text => ({
          type: 'mrkdwn',
          text
        }))
      };
    }
    
    // Create input field
    static input(
      label: string,
      block_id: string,
      action_id: string,
      placeholder?: string,
      initial_value?: string,
      multiline = false,
      optional = false
    ): any {
      return {
        type: 'input',
        block_id,
        element: {
          type: 'plain_text_input',
          action_id,
          placeholder: placeholder ? {
            type: 'plain_text',
            text: placeholder
          } : undefined,
          initial_value,
          multiline
        },
        label: {
          type: 'plain_text',
          text: label
        },
        optional
      };
    }
    
    // Create select dropdown
    static select(
      label: string,
      block_id: string,
      action_id: string,
      options: Array<{ text: string; value: string }>,
      initial_value?: string,
      placeholder?: string
    ): any {
      return {
        type: 'input',
        block_id,
        element: {
          type: 'static_select',
          action_id,
          placeholder: placeholder ? {
            type: 'plain_text',
            text: placeholder
          } : undefined,
          initial_option: initial_value ? {
            text: {
              type: 'plain_text',
              text: options.find(opt => opt.value === initial_value)?.text || initial_value
            },
            value: initial_value
          } : undefined,
          options: options.map(opt => ({
            text: {
              type: 'plain_text',
              text: opt.text
            },
            value: opt.value
          }))
        },
        label: {
          type: 'plain_text',
          text: label
        }
      };
    }
}

// Singleton instance for the hackathon
export const viewState = new ViewStateManager();
export const ViewHelpers = ViewHelpersClass;
export const BlockKitHelpers = BlockKitHelpersClass;