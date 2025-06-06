import { config } from 'dotenv';

config();

export const slackConfig = {
  // OAuth & App Credentials
  clientId: process.env.SLACK_CLIENT_ID || '',
  clientSecret: process.env.SLACK_CLIENT_SECRET || '',
  signingSecret: process.env.SLACK_SIGNING_SECRET || '',
  
  // Bot Token (for API calls after installation)
  botToken: process.env.SLACK_BOT_TOKEN || '',
  
  // OAuth Scopes
  scopes: [
    'app_mentions:read',
    'channels:history',
    'channels:read',
    'chat:write',
    'groups:history',
    'groups:read',
    'im:history',
    'im:read',
    'mpim:history',
    'mpim:read',
    'reactions:read',
    'users:read',
    'users:read.email'
  ],
  
  // Webhook endpoints
  endpoints: {
    events: '/slack/events',
    interactions: '/slack/interactions',
    oauth: '/slack/oauth',
    commands: '/slack/commands'
  },
  
  // App URLs
  redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/slack/oauth/callback',
  
  // Event subscriptions
  eventSubscriptions: [
    'message.channels',
    'message.groups',
    'message.im',
    'message.mpim',
    'app_mention',
    'app_home_opened'
  ]
};

// Validation helper
export function validateSlackConfig(): string[] {
  const errors: string[] = [];
  
  if (!slackConfig.clientId) errors.push('SLACK_CLIENT_ID is required');
  if (!slackConfig.clientSecret) errors.push('SLACK_CLIENT_SECRET is required');
  if (!slackConfig.signingSecret) errors.push('SLACK_SIGNING_SECRET is required');
  
  return errors;
}