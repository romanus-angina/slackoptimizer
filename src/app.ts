import express from 'express';
import SlackBolt, { App, ExpressReceiver as ExpressReceiverType } from '@slack/bolt';
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
    this.initializeSlack();          // ← MUST BE FIRST - creates expressReceiver
    this.initializeExpress();        // ← SECOND - uses expressReceiver.app
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

  private initializeSlack(): void {
    console.log('🔧 Initializing Slack...');
    
    // Create ExpressReceiver first
    this.expressReceiver = new ExpressReceiver({
      signingSecret: slackConfig.signingSecret,
      endpoints: '/slack/events',
      processBeforeResponse: true
    });

    console.log('✅ ExpressReceiver created');

    // Create Slack app with the receiver
    this.slackApp = new SlackApp({
      token: slackConfig.botToken,
      signingSecret: slackConfig.signingSecret,
      receiver: this.expressReceiver
    });

    console.log('✅ Slack app initialized with ExpressReceiver');
  }

  private initializeExpress(): void {
    console.log('🔧 Initializing Express...');
    
    // Now this should work because expressReceiver was created in initializeSlack()
    this.app = this.expressReceiver.app;
    
    console.log('✅ Express app obtained from receiver');
    
    // CORS configuration
    this.app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', appConfig.security.corsOrigins.join(','));
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      next();
    });

    console.log('✅ Express app configured with CORS');
  }

  private initializeControllers(): void {
    console.log('🔧 Initializing controllers...');

    // Initialize controllers with the Slack app and receiver
    this.oauthController = new SlackOAuthController(this.slackApp, this.expressReceiver);
    this.eventController = new SlackEventController(this.slackApp, this.expressReceiver);
    this.interactionController = new SlackInteractionController(this.slackApp, this.expressReceiver);

    // Register all controller routes and event handlers
    this.oauthController.register();
    this.eventController.register();
    this.interactionController.register();

    console.log('✅ Controllers initialized and registered');
  }

  private setupRoutes(): void {
    console.log('🔧 Setting up routes...');
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: appConfig.app.version,
        environment: appConfig.server.env
      });
    });

    this.app.get('/slack/oauth/callback', async (req, res) => {
      try {
        const { code, state, error } = req.query;
    
        if (error) {
          console.error('OAuth error:', error);
          return res.status(400).send(`
            <html>
              <head><title>Installation Failed</title></head>
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
                }
                .container { 
                  max-width: 500px;
                  margin: 0 auto;
                  background: rgba(255,255,255,0.1);
                  padding: 40px;
                  border-radius: 20px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🎉 Success!</h1>
                <p>Smart Notifications has been installed!</p>
                <p>Go to your Slack app and click on Smart Notifications in the sidebar.</p>
                <a href="slack://app" style="color: white;">Open Slack</a>
              </div>
            </body>
          </html>
        `);
    
      } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).send(`
          <html>
            <body>
              <h1>Installation Error</h1>
              <p>Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}</p>
              <p><a href="/">Retry Installation</a></p>
            </body>
          </html>
        `);
      }
    });

    // Slack OAuth install endpoint
    this.app.get('/slack/install', (req, res) => {
      const installUrl = this.oauthController.getInstallUrl();
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
              }
              .container { 
                max-width: 600px; 
                margin: 0 auto;
                background: rgba(255,255,255,0.1);
                padding: 40px;
                border-radius: 20px;
              }
              .install-btn {
                display: inline-block;
                padding: 15px 30px;
                background: #4A154B;
                color: white;
                text-decoration: none;
                border-radius: 10px;
                font-weight: bold;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🧠 Smart Notifications</h1>
              <p>AI-powered notification filtering for Slack</p>
              <a href="/slack/install" class="install-btn">Add to Slack</a>
              <p><small>Server is running! ✅</small></p>
            </div>
          </body>
        </html>
      `);
    });

    this.app.post('/test-ai', express.json(), async (req, res) => {
      try {
        const { message } = req.body;
        
        if (!message) {
          return res.status(400).json({ error: 'Message is required' });
        }
    
        console.log(`🧪 Testing AI classification for: "${message}"`);
        
        // Create a simple test using your AI service
        const aiService = new (await import('./services/AIBackendService')).AIBackendService();
        
        const result = await aiService.testClassifyMessage(
          message,
          'test-user',
          'test-channel'
        );
    
        console.log('🎯 AI Test Result:', result);
    
        res.json({
          success: true,
          input: message,
          result: result,
          explanation: {
            decision: result.should_notify ? 'WOULD NOTIFY' : 'WOULD FILTER',
            confidence: `${result.confidence}%`,
            category: result.category,
            reasoning: result.reasoning
          }
        });
    
      } catch (error) {
        console.error('❌ AI test failed:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
    
    // Add some quick test buttons
    this.app.get('/test-ai-ui', (req, res) => {
      res.send(`
        <html>
          <head>
            <title>AI Classification Test</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
              .test-box { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
              button { padding: 10px 15px; margin: 5px; background: #4A154B; color: white; border: none; border-radius: 5px; cursor: pointer; }
              button:hover { background: #611f69; }
              #result { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
              textarea { width: 100%; height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>🧠 AI Classification Test</h1>
            
            <div class="test-box">
              <h3>Test Custom Message</h3>
              <textarea id="customMessage" placeholder="Enter your test message here..."></textarea>
              <br><button onclick="testCustom()">Test Classification</button>
            </div>
            
            <div class="test-box">
              <h3>Quick Tests</h3>
              <button onclick="testMessage('Help! The deployment pipeline is broken and blocking releases!')">🚨 Urgent Test</button>
              <button onclick="testMessage('Anyone want to grab coffee?')">☕ Social Test</button>
              <button onclick="testMessage('Meeting reminder: standup at 10am tomorrow')">📅 Meeting Test</button>
              <button onclick="testMessage('The new feature is ready for review')">💼 Work Test</button>
            </div>
            
            <div id="result"></div>
            
            <script>
              async function testMessage(message) {
                const resultDiv = document.getElementById('result');
                resultDiv.innerHTML = '<p>🤖 Testing classification...</p>';
                
                try {
                  const response = await fetch('/test-ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                  });
                  
                  const data = await response.json();
                  
                  if (data.success) {
                    const emoji = data.result.should_notify ? '✅' : '❌';
                    resultDiv.innerHTML = \`
                      <h3>\${emoji} Classification Result</h3>
                      <p><strong>Input:</strong> "\${data.input}"</p>
                      <p><strong>Decision:</strong> \${data.explanation.decision}</p>
                      <p><strong>Category:</strong> \${data.explanation.category}</p>
                      <p><strong>Confidence:</strong> \${data.explanation.confidence}</p>
                      <p><strong>Reasoning:</strong> \${data.explanation.reasoning}</p>
                      <hr>
                      <details>
                        <summary>Full Result</summary>
                        <pre>\${JSON.stringify(data.result, null, 2)}</pre>
                      </details>
                    \`;
                  } else {
                    resultDiv.innerHTML = \`<p style="color: red;">❌ Error: \${data.error}</p>\`;
                  }
                } catch (error) {
                  resultDiv.innerHTML = \`<p style="color: red;">❌ Network Error: \${error.message}</p>\`;
                }
              }
              
              function testCustom() {
                const message = document.getElementById('customMessage').value;
                if (message.trim()) {
                  testMessage(message);
                } else {
                  alert('Please enter a message to test');
                }
              }
            </script>
          </body>
        </html>
      `);
    });
    
    console.log('🧪 AI test endpoints added: /test-ai and /test-ai-ui');

    console.log('✅ Routes configured');
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

    console.log('✅ Error handling configured');
  }

  public async start(): Promise<void> {
    try {
      // Use the receiver's start method instead of creating our own server
      this.server = await this.expressReceiver.start(appConfig.server.port);
      
      console.log(`
🚀 Smart Notifications Slack App started successfully!

🌐 Server: http://${appConfig.server.host}:${appConfig.server.port}
🔧 Environment: ${appConfig.server.env}
❤️ Health Check: http://${appConfig.server.host}:${appConfig.server.port}/health

📦 Slack App URLs:
  Install: http://${appConfig.server.host}:${appConfig.server.port}/slack/install
  Events: http://${appConfig.server.host}:${appConfig.server.port}/slack/events

Ready to filter some notifications! 🎯
      `);

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
      await this.expressReceiver.stop();
      console.log('Server closed');
      process.exit(0);
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