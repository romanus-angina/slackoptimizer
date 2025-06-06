import { App as SlackApp, ExpressReceiver } from '@slack/bolt';
import { BaseController } from './BaseController';
import { slackConfig } from '../config/slack';

export class SlackOAuthController extends BaseController {
  constructor(slackApp: SlackApp, expressReceiver: ExpressReceiver) {
    super(slackApp, expressReceiver);
  }

  register(): void {
    // Handle OAuth success callback
    this.expressReceiver.router.get('/slack/oauth/callback', 
      this.handleOAuthCallback.bind(this));

    // Handle installation success
    this.slackApp.event('app_home_opened', this.handleAppHomeOpened.bind(this));

    console.log('[SlackOAuthController] OAuth routes registered');
  }

  private async handleOAuthCallback(req: any, res: any): Promise<void> {
    try {
      const { code, state, error } = req.query;

      if (error) {
        console.error('OAuth error:', error);
        return res.status(400).send(`
          <html>
            <body>
              <h1>Installation Failed</h1>
              <p>Error: ${error}</p>
              <p><a href="/">Try again</a></p>
            </body>
          </html>
        `);
      }

      if (!code) {
        return res.status(400).send(`
          <html>
            <body>
              <h1>Installation Failed</h1>
              <p>Missing authorization code</p>
              <p><a href="/">Try again</a></p>
            </body>
          </html>
        `);
      }

      // Exchange code for tokens
      const result = await this.slackApp.client.oauth.v2.access({
        client_id: slackConfig.clientId,
        client_secret: slackConfig.clientSecret,
        code: code as string,
        redirect_uri: slackConfig.redirectUri
      });

      if (!result.ok) {
        throw new Error(`OAuth exchange failed: ${result.error}`);
      }

      console.log('OAuth success:', {
        team_id: result.team?.id,
        user_id: result.authed_user?.id,
        bot_user_id: result.bot_user_id
      });

      // Register user in backend
      await this.registerUserInBackend(result);

      // Send success response
      res.send(`
        <html>
          <head>
            <title>Installation Successful</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .success { color: #28a745; }
              .container { max-width: 500px; margin: 0 auto; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="success">🎉 Installation Successful!</h1>
              <p>Smart Notifications has been installed to your Slack workspace.</p>
              <p>Go to your Slack app and click on the <strong>Smart Notifications</strong> app in the sidebar to get started.</p>
              <p><a href="slack://app">Open Slack</a></p>
            </div>
          </body>
        </html>
      `);

    } catch (error) {
      this.handleError(error as Error, 'handleOAuthCallback');
      res.status(500).send(`
        <html>
          <body>
            <h1>Installation Error</h1>
            <p>Something went wrong during installation. Please try again.</p>
            <p><a href="/">Retry Installation</a></p>
          </body>
        </html>
      `);
    }
  }

  private async registerUserInBackend(oauthResult: any): Promise<void> {
    try {
      if (!oauthResult.authed_user?.id || !oauthResult.team?.id) {
        throw new Error('Missing user or team information from OAuth');
      }

      // Get user info from Slack
      const slackUser = await this.getSlackUser(
        oauthResult.authed_user.id, 
        oauthResult.team.id
      );

      if (!slackUser) {
        throw new Error('Failed to fetch user information from Slack');
      }

      // Check if backend is available
      const backendHealthy = await this.isBackendHealthy();
      if (!backendHealthy) {
        console.warn('Backend unavailable during user registration, will retry later');
        // For now, we'll continue - the user will be created when they first interact
        return;
      }

      // Ensure user exists in backend
      await this.ensureUserExists(slackUser);

      console.log(`User registered successfully: ${slackUser.id} in team ${slackUser.team_id}`);

    } catch (error) {
      console.error('Failed to register user in backend:', error);
      // Don't fail the OAuth flow - user can be created later
    }
  }

  private async handleAppHomeOpened({ event, client }: any): Promise<void> {
    try {
      const { user, tab } = event;

      // Only handle the 'home' tab
      if (tab !== 'home') {
        return;
      }

      console.log(`App home opened by user: ${user}`);

      // Get user info
      const slackUser = await this.getSlackUser(user, event.team || '');
      if (!slackUser) {
        throw new Error('Failed to get user information');
      }

      // Ensure user exists in backend
      await this.ensureUserExists(slackUser);

      // For now, publish a simple welcome view
      // We'll build proper views in the next phase
      await client.views.publish({
        user_id: user,
        view: {
          type: 'home',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Welcome to Smart Notifications!* 👋\n\nHi <@${user}>! Your intelligent notification filtering is being set up.\n\n_Full interface coming soon..._`
              }
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'Get Started'
                  },
                  action_id: 'get_started',
                  style: 'primary'
                }
              ]
            }
          ]
        }
      });

    } catch (error) {
      this.handleError(error as Error, 'handleAppHomeOpened');
    }
  }

  // Helper method to generate OAuth install URL
  public getInstallUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: slackConfig.clientId,
      scope: slackConfig.scopes.join(','),
      redirect_uri: slackConfig.redirectUri,
      response_type: 'code'
    });

    if (state) {
      params.append('state', state);
    }

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }
}