import { config } from 'dotenv';

config();

export const slackConfig = {
    // OAuth & App Credentials
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    
    // Bot Token (for API calls after installation)
    botToken: process.env.SLACK_BOT_TOKEN || '',
    
    // UPDATED OAuth Scopes - now includes im:write for DMs
    scopes: [
      'channels:history',    // Read message history in public channels
      'channels:read',       // View basic info about public channels
      'chat:write',          // Send messages as bot
      'groups:history',      // Read message history in private channels
      'groups:read',         // View basic info about private channels
      'im:history',          // Read direct message history
      'im:read',             // View basic info about direct messages
      'im:write',            // Send direct messages to users
      'mpim:history',        // Read group direct message history
      'mpim:read',           // View basic info about group direct messages
      'reactions:read',      // Read emoji reactions
      'users:read',          // Read user profile info
      'users:read.email'     // Read user email addresses
    ],
    
    // Webhook endpoints
    endpoints: {
      events: '/slack/events',
      interactions: '/slack/interactions',
      oauth: '/slack/oauth',
      commands: '/slack/commands'
    },
    
    // OAuth configuration - full URL for redirect
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