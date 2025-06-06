export interface ViewState {
    loading: boolean;
    error?: string;
    data?: any;
  }
  
  export interface BlockKitElement {
    type: string;
    [key: string]: any;
  }
  
  export interface BlockKitView {
    type: 'home' | 'modal' | 'workflow_step';
    blocks: BlockKitElement[];
    private_metadata?: string;
    callback_id?: string;
    title?: {
      type: 'plain_text';
      text: string;
    };
    submit?: {
      type: 'plain_text';
      text: string;
    };
    close?: {
      type: 'plain_text';
      text: string;
    };
  }
  
  export interface HomeViewData {
    user: {
      id: string;
      name: string;
    };
    settings: {
      notification_level: string;
      channels_monitored: number;
      filters_active: number;
    };
    recent_activity: Array<{
      channel: string;
      message_count: number;
      filtered_count: number;
      timestamp: string;
    }>;
    quick_actions: Array<{
      action_id: string;
      text: string;
      style?: 'primary' | 'danger';
    }>;
  }
  
  export interface SettingsViewData {
    current_settings: any;
    available_channels: Array<{
      id: string;
      name: string;
      is_private: boolean;
      is_member: boolean;
    }>;
    validation_errors?: {
      [field: string]: string;
    };
  }
  
  export interface TestingViewData {
    test_messages: Array<{
      id: string;
      text: string;
      channel: string;
      result: {
        should_notify: boolean;
        confidence: number;
        reasoning: string;
      };
      timestamp: string;
    }>;
    channels_available: string[];
  }
  
  // Action types for interaction handling
  export type ActionType = 
    | 'settings_update'
    | 'channel_toggle'
    | 'test_message'
    | 'view_analytics'
    | 'onboarding_next'
    | 'onboarding_skip';
  
  export interface ActionPayload {
    action_type: ActionType;
    user_id: string;
    data: any;
    metadata?: string;
  }