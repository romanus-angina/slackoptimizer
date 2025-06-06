import express from 'express';
import SlackBolt, { App, ExpressReceiver as ExpressReceiverType, Installation, InstallationQuery } from '@slack/bolt';
const { App: SlackApp, ExpressReceiver } = SlackBolt;
import { appConfig } from './config/app';
import { slackConfig, validateSlackConfig } from './config/slack';
import { backendConfig, validateBackendConfig } from './config/backend';

// Import controllers
import { SlackOAuthController } from './controllers/SlackOAuthController';
import { SlackEventController } from './controllers/SlackEventController';
import { SlackInteractionController } from './controllers/SlackInteractionController';

class SmartNotificationsApp {
  private app!: express.Application;
  private slackApp!: App;
  private expressReceiver!: ExpressReceiverType;
  private server: any;

  // Controllers
  private oauthController!: SlackOAuthController;
  private eventController!: SlackEventController;
  private interactionController!: SlackInteractionController;

  constructor() {
    this.validateConfiguration();
    this.initializeExpress();
    this.initializeSlack();
    this.initializeControllers();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private validateConfiguration(): void {
    // Validate Slack config
    const slackErrors = validateSlackConfig();
    if (slackErrors.length > 0) {
      console.error('❌ Slack configuration errors:');
      slackErrors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }

    // Validate Backend config
    const backendErrors = validateBackendConfig();
    if (backendErrors.length > 0) {
      console.error('❌ Backend configuration errors:');
      backendErrors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }

    console.log('✅ Configuration validated');
  }

  private initializeExpress(): void {
    this.app = express();
    
    // CORS configuration - do this first
    this.app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', appConfig.security.corsOrigins.join(','));
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      next();
    });

    // IMPORTANT: Don't add body parsing middleware here!
    // The ExpressReceiver has its own body parsing that conflicts with express.json()
    
    console.log('Express app initialized');
  }

  private initializeSlack(): void {
    // Simple single-workspace setup using bot token
    this.slackApp = new SlackApp({
      token: slackConfig.botToken,  // Use the bot token directly
      signingSecret: slackConfig.signingSecret,
      
      // Remove the complex OAuth installation store for now
      // This will work for single workspace during hackathon
    });
  
    console.log('Slack app initialized (single workspace mode with bot token)');
  }

  private initializeControllers(): void {
    console.log('Initializing controllers...');

    // Initialize controllers with the Slack app
    this.oauthController = new SlackOAuthController(this.slackApp, this.expressReceiver);
    this.eventController = new SlackEventController(this.slackApp, this.expressReceiver);
    this.interactionController = new SlackInteractionController(this.slackApp, this.expressReceiver);

    // Register all controller routes and event handlers
    this.oauthController.register();
    this.eventController.register();
    this.interactionController.register();

    console.log('Controllers initialized and registered');
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: appConfig.app.version,
        environment: appConfig.server.env
      });
    });

    // Slack OAuth install endpoint
    this.app.get('/slack/install', (req, res) => {
      const installUrl = this.oauthController.getInstallUrl();
      res.redirect(installUrl);
    });

    // OAuth callback route
    this.app.get('/slack/oauth/callback', async (req, res) => {
      try {
        const { code, state, error } = req.query;

        if (error) {
          console.error('OAuth error:', error);
          return res.status(400).send(`
            <html>
              <head>
                <title>Installation Failed</title>
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                  .error { color: #dc3545; }
                </style>
              </head>
              <body>
                <h1 class="error">Installation Failed</h1>
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

        // Exchange code for tokens using Slack Web API
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

        // Send success response
        res.send(`
          <html>
            <head>
              <title>Installation Successful</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 50px;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  margin: 0;
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .container { 
                  max-width: 500px;
                  background: rgba(255,255,255,0.1);
                  padding: 40px;
                  border-radius: 20px;
                  backdrop-filter: blur(10px);
                }
                .success { color: #28a745; font-size: 60px; margin-bottom: 20px; }
                .btn {
                  display: inline-block;
                  padding: 15px 30px;
                  background: #4A154B;
                  color: white;
                  text-decoration: none;
                  border-radius: 10px;
                  font-weight: bold;
                  margin: 20px 10px;
                  transition: background 0.3s;
                }
                .btn:hover { background: #611f69; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="success">🎉</div>
                <h1>Installation Successful!</h1>
                <p>Smart Notifications has been installed to your Slack workspace.</p>
                <p>Go to your Slack app and click on the <strong>Smart Notifications</strong> app in the sidebar to get started.</p>
                <a href="slack://app" class="btn">Open Slack</a>
                <a href="/" class="btn">Back to Home</a>
              </div>
            </body>
          </html>
        `);

      } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).send(`
          <html>
            <head>
              <title>Installation Error</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .error { color: #dc3545; }
              </style>
            </head>
            <body>
              <h1 class="error">Installation Error</h1>
              <p>Something went wrong during installation: ${error instanceof Error ? error.message : 'Unknown error'}</p>
              <p><a href="/">Retry Installation</a></p>
            </body>
          </html>
        `);
      }
    });

    // Landing page for installation
    this.app.get('/', (req, res) => {
      res.send(`
        <html>
          <head>
            <title>Smart Notifications for Slack</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container { 
                max-width: 600px; 
                background: rgba(255,255,255,0.1);
                padding: 40px;
                border-radius: 20px;
                backdrop-filter: blur(10px);
              }
              .logo { font-size: 60px; margin-bottom: 20px; }
              h1 { margin: 20px 0; }
              .install-btn {
                display: inline-block;
                padding: 15px 30px;
                background: #4A154B;
                color: white;
                text-decoration: none;
                border-radius: 10px;
                font-weight: bold;
                margin: 20px 0;
                transition: background 0.3s;
              }
              .install-btn:hover { background: #611f69; }
              .features {
                text-align: left;
                margin: 30px 0;
                padding: 20px;
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">🧠</div>
              <h1>Smart Notifications for Slack</h1>
              <p>AI-powered notification filtering to reduce noise and boost productivity</p>
              
              <div class="features">
                <h3>✨ Features:</h3>
                <ul>
                  <li>🎯 Intelligent message classification</li>
                  <li>🔕 Customizable quiet hours</li>
                  <li>📊 Notification analytics</li>
                  <li>⚙️ Per-channel settings</li>
                  <li>🧪 Test filtering before applying</li>
                </ul>
              </div>
              
              <a href="/slack/install" class="install-btn">
                Add to Slack
              </a>
              
              <p><small>Free during hackathon • No data stored permanently</small></p>
            </div>
          </body>
        </html>
      `);
    });

    // SIMPLE FIX: Use ExpressReceiver's built-in OAuth + events handling
    // Remove our custom challenge handler and let ExpressReceiver handle everything
    this.app.use(this.expressReceiver.router);

    console.log('Routes configured');
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          message: appConfig.server.env === 'production' ? 'Internal server error' : error.message,
          timestamp: new Date().toISOString()
        }
      });
    });

    // 404 handler
    this.app.use((req: express.Request, res: express.Response) => {
      res.status(404).json({
        success: false,
        error: {
          message: 'Endpoint not found',
          path: req.path,
          timestamp: new Date().toISOString()
        }
      });
    });

    console.log('Error handling configured');
  }

  public async start(): Promise<void> {
    try {
      this.server = this.app.listen(appConfig.server.port, appConfig.server.host, () => {
        console.log(`
🚀 Smart Notifications Slack App started successfully!

🌐 Server: http://${appConfig.server.host}:${appConfig.server.port}
🔧 Environment: ${appConfig.server.env}
❤️ Health Check: http://${appConfig.server.host}:${appConfig.server.port}/health

📦 Slack App URLs:
  Install: http://${appConfig.server.host}:${appConfig.server.port}/slack/install
  Events: http://${appConfig.server.host}:${appConfig.server.port}/slack/events
  OAuth: http://${appConfig.server.host}:${appConfig.server.port}/slack/oauth

🔗 Backend API: ${backendConfig.baseUrl}

Ready to filter some notifications! 🎯
        `);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    console.log('Shutting down gracefully...');
    
    if (this.server) {
      this.server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    }
  }

  // Expose the Slack app for use by other parts of the application
  public getSlackApp(): App {
    return this.slackApp;
  }

  // Expose the Express app for additional route mounting
  public getExpressApp(): express.Application {
    return this.app;
  }

  // Expose controllers for testing or additional configuration
  public getControllers() {
    return {
      oauth: this.oauthController,
      events: this.eventController,
      interactions: this.interactionController
    };
  }
}

// Start the application
const smartNotificationsApp = new SmartNotificationsApp();
smartNotificationsApp.start().catch(console.error);

export default smartNotificationsApp;