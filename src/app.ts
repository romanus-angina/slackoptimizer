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
    console.log('🔍 Slack configuration validation:');
    console.log('- Bot token exists:', !!slackConfig.botToken);
    console.log('- Bot token starts with xoxb:', slackConfig.botToken?.startsWith('xoxb-'));
    console.log('- Signing secret exists:', !!slackConfig.signingSecret);
    
    if (!slackConfig.botToken || !slackConfig.botToken.startsWith('xoxb-')) {
      throw new Error('❌ Invalid SLACK_BOT_TOKEN - must start with xoxb-');
    }
  
    // Create Slack app WITHOUT built-in server
    // We'll handle events through our Express app instead
    this.slackApp = new SlackApp({
      token: slackConfig.botToken,
      signingSecret: slackConfig.signingSecret,
      
      // No port - we'll handle HTTP ourselves
      // This prevents Slack Bolt from starting its own server
      
      // Add debugging
      logLevel: 'DEBUG'
    });
  
    console.log('✅ Slack app initialized (no built-in server)');
    
    // Test connection immediately
    this.testSlackAuth();
  }
  
  // ADD this method for testing auth
  private async testSlackAuth(): Promise<void> {
    try {
      console.log('🧪 Testing Slack authentication...');
      
      const authTest = await this.slackApp.client.auth.test();
      
      if (authTest.ok) {
        console.log('✅ Authentication successful!');
        console.log(`   Bot User: ${authTest.user}`);
        console.log(`   Bot ID: ${authTest.user_id}`);
        console.log(`   Team: ${authTest.team}`);
        console.log(`   URL: ${authTest.url}`);
      } else {
        console.error('❌ Authentication failed:', authTest.error);
      }
      
    } catch (error) {
      console.error('❌ Slack authentication test failed:', error);
      console.error('Check your SLACK_BOT_TOKEN and app permissions');
    }
  }

  private initializeControllers(): void {
    console.log('Initializing controllers...');

    // Initialize controllers with the Slack app
    this.oauthController = new SlackOAuthController(this.slackApp);
    this.eventController = new SlackEventController(this.slackApp);
    this.interactionController = new SlackInteractionController(this.slackApp);

    // Register all controller routes and event handlers
    this.oauthController.register();
    this.eventController.register();
    this.interactionController.register();

    console.log('Controllers initialized and registered');
  }

  private setupRoutes(): void {
    // Add body parsing middleware for Slack events
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: appConfig.app.version,
        environment: appConfig.server.env
      });
    });
  
    // Slack status endpoint for debugging
    this.app.get('/slack/status', async (req, res) => {
      try {
        const authTest = await this.slackApp.client.auth.test();
        res.json({
          status: 'connected',
          bot_user: authTest.user,
          bot_id: authTest.user_id,
          team: authTest.team,
          team_id: authTest.team_id
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  
    // Slack Events endpoint - SIMPLIFIED
    this.app.post('/slack/events', async (req, res) => {
      try {
        console.log('📨 Received Slack event:', req.body?.type);
        
        // Handle URL verification challenge
        if (req.body?.type === 'url_verification') {
          console.log('✅ URL verification challenge received');
          return res.json({ challenge: req.body.challenge });
        }
  
        // Handle actual events
        if (req.body?.event) {
          console.log(`🎯 Processing event: ${req.body.event.type}`);
          
          // Let your controllers handle the event through the SlackApp
          // The event handlers you registered will automatically be called
          
          // For now, just acknowledge
          res.status(200).json({ ok: true });
        } else {
          console.log('⚠️ Unknown event structure:', req.body);
          res.status(200).json({ ok: true });
        }
        
      } catch (error) {
        console.error('❌ Error processing Slack event:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  
    // Slack Interactions endpoint - SIMPLIFIED  
    this.app.post('/slack/interactions', async (req, res) => {
      try {
        console.log('🔗 Received Slack interaction');
        
        let payload;
        if (req.body.payload) {
          payload = JSON.parse(req.body.payload);
        } else {
          payload = req.body;
        }
        
        console.log(`🎯 Processing interaction: ${payload.type}`);
        
        // Acknowledge the interaction
        res.status(200).json({ ok: true });
        
      } catch (error) {
        console.error('❌ Error processing Slack interaction:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  
    // Simple OAuth install redirect
    this.app.get('/slack/install', (req, res) => {
      const installUrl = `https://slack.com/oauth/v2/authorize?client_id=${slackConfig.clientId}&scope=${slackConfig.scopes.join(',')}&redirect_uri=${encodeURIComponent(slackConfig.redirectUri)}`;
      res.redirect(installUrl);
    });
  
    // Landing page
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
              .debug-info {
                margin-top: 20px;
                padding: 10px;
                background: rgba(0,0,0,0.2);
                border-radius: 5px;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">🧠</div>
              <h1>Smart Notifications for Slack</h1>
              <p>AI-powered notification filtering to reduce noise and boost productivity</p>
              
              <a href="/slack/install" class="install-btn">
                Add to Slack
              </a>
              
              <div class="debug-info">
                <p><strong>Slack App URLs (use these in your Slack app settings):</strong></p>
                <p>Events: https://your-ngrok-url.ngrok.io/slack/events</p>
                <p>Interactions: https://your-ngrok-url.ngrok.io/slack/interactions</p>
                <p><a href="/slack/status" style="color: #fff;">Test Bot Connection</a></p>
              </div>
              
              <p><small>Free during hackathon</small></p>
            </div>
          </body>
        </html>
      `);
    });
  
    console.log('✅ Routes configured on port 3000');
    console.log('📡 Use these URLs in your Slack app:');
    console.log('   Events: https://your-ngrok-url.ngrok.io/slack/events');
    console.log('   Interactions: https://your-ngrok-url.ngrok.io/slack/interactions');
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