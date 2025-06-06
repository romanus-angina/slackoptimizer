export interface SlackUser {
    id: string;
    name: string;
    email: string;
    team_id: string;
    timezone?: string;
  }
  
  export interface SlackChannel {
    id: string;
    name: string;
    is_private: boolean;
    is_member: boolean;
    topic?: {
      value: string;
    };
    purpose?: {
      value: string;
    };
  }
  
  export interface SlackMessage {
    ts: string;
    channel: string;
    user: string;
    text: string;
    thread_ts?: string;
    attachments?: any[];
    blocks?: any[];
    reactions?: Array<{
      name: string;
      count: number;
      users: string[];
    }>;
  }
  
  export interface SlackEvent {
    type: string;
    user?: string;
    channel?: string;
    ts?: string;
    text?: string;
    thread_ts?: string;
    channel_type?: string;
    event_ts: string;
  }
  
  export interface SlackInteraction {
    type: 'block_actions' | 'view_submission' | 'shortcut' | 'message_action';
    user: SlackUser;
    channel?: SlackChannel;
    actions?: Array<{
      action_id: string;
      type: string;
      value?: string;
      selected_option?: {
        value: string;
        text: { type: string; text: string };
      };
    }>;
    view?: {
      state: any;
      private_metadata?: string;
    };
  }
  
  export interface SlackOAuthResponse {
    access_token: string;
    team: {
      id: string;
      name: string;
    };
    authed_user: {
      id: string;
      access_token: string;
    };
    scope: string;
    bot_user_id: string;
  }