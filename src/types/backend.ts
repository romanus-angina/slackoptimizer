export interface BackendUser {
    slack_user_id: string;
    team_id: string;
    email: string;
    created_at: string;
    updated_at: string;
    settings: UserSettings;
  }
  
  export interface UserSettings {
    notification_level: 'all' | 'mentions' | 'important' | 'none';
    keywords: string[];
    channels: {
      [channel_id: string]: {
        enabled: boolean;
        priority: 'high' | 'medium' | 'low';
        custom_rules?: string[];
      };
    };
    quiet_hours: {
      enabled: boolean;
      start_time: string; // HH:MM format
      end_time: string;   // HH:MM format
      timezone: string;
    };
    filters: {
      spam_detection: boolean;
      duplicate_detection: boolean;
      importance_threshold: number; // 0-100
    };
  }
  
  export interface ClassificationRequest {
    message: {
      text: string;
      user_id: string;
      channel_id: string;
      timestamp: string;
      thread_ts?: string;
    };
    context: {
      user_settings: UserSettings;
      channel_info: {
        name: string;
        is_private: boolean;
        member_count?: number;
      };
    };
  }
  
  export interface ClassificationResult {
    should_notify: boolean;
    confidence: number; // 0-100
    reasoning: string;
    category: 'mention' | 'keyword' | 'important' | 'spam' | 'general';
    priority: 'high' | 'medium' | 'low';
    tags: string[];
  }
  
  export interface AnalyticsData {
    user_id: string;
    period: 'day' | 'week' | 'month';
    metrics: {
      total_messages: number;
      filtered_messages: number;
      notifications_sent: number;
      channels_active: number;
      top_channels: Array<{
        channel_id: string;
        channel_name: string;
        message_count: number;
        filtered_count: number;
      }>;
      filter_effectiveness: number; // percentage
    };
  }
  
  export interface BackendAPIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
      code: string;
      message: string;
      details?: any;
    };
    timestamp: string;
  }