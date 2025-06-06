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
    console.log('Validating configuration...');
    
    const slackErrors = validateSlackConfig();
    const backendErrors = validateBackendConfig();
    const allErrors = [...slackErrors, ...backendErrors];

    if (allErrors.length > 0) {
      console.error('Configuration validation failed:');
      allErrors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }

    console.log('Configuration validated successfully');
  }

  private initializeExpress(): void {
    this.app = express();
    
    // Basic middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS configuration
    this.app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', appConfig.security.corsOrigins.join(','));
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      next();
    });

    console.log('Express app initialized');
  }

  private initializeSlack(): void {
    // Create ExpressReceiver with both properties to satisfy runtime requirements
    this.expressReceiver = new ExpressReceiver({
      signingSecret: slackConfig.signingSecret,
      clientId: slackConfig.clientId,
      clientSecret: slackConfig.clientSecret,
      stateSecret: 'my-state-secret-' + Date.now(),
      
      // OAuth settings
      scopes: slackConfig.scopes,
      installerOptions: {
        redirectUri: slackConfig.redirectUri,
        redirectUriPath: '/slack/oauth/callback'
      },
      
      // Installation store for multi-workspace
      installationStore: {
        storeInstallation: async (installation: Installation) => {
          console.log('Installation stored:', installation.team?.id);
          // TODO: Implement proper installation storage
          return;
        },
        fetchInstallation: async (installQuery: InstallationQuery<boolean>) => {
          console.log('Fetching installation for:', installQuery.teamId);
          
          // For development, return a mock installation
          if (installQuery.teamId) {
            return {
              team: { id: installQuery.teamId },
              enterprise: installQuery.enterpriseId ? { id: installQuery.enterpriseId } : undefined,
              user: { 
                id: installQuery.userId || '',
                token: undefined,
                scopes: []
              },
              bot: {
                token: slackConfig.botToken,
                scopes: slackConfig.scopes,
                id: 'bot-id',
                userId: 'bot-user-id'
              },
              incomingWebhook: undefined,
              appId: undefined,
              tokenType: 'bot' as const
            };
          }
          throw new Error('Failed to fetch installation');
        },
        deleteInstallation: async (installQuery: InstallationQuery<boolean>) => {
          console.log('Deleting installation for:', installQuery.teamId);
          // TODO: Implement proper installation deletion
          return;
        }
      }
    } as any); // Cast to any to bypass TypeScript checking

    // Create SlackApp with the ExpressReceiver
    this.slackApp = new SlackApp({
      receiver: this.expressReceiver
    });

    console.log('Slack app initialized (multi-workspace OAuth mode)');
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

    // Slack endpoints - using ExpressReceiver's router
    this.app.use('/slack/events', this.expressReceiver.router);

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