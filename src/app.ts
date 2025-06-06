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
    try {
      console.log('🚀 Starting SmartNotificationsApp...');
      this.validateConfiguration();
      this.initializeSlack();
      this.initializeExpress();
      this.setupTestRoutes(); // Add test routes FIRST
      this.setupSlackDebugHandlers(); // Add Slack debug handlers
      this.initializeControllers(); // Then add your controllers
      this.setupMainRoutes(); // Then main routes
      this.setupErrorHandling();
      console.log('✅ SmartNotificationsApp initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      throw error;
    }
  }

  private validateConfiguration(): void {
    console.log('🔍 Validating configuration...');
    
    const slackErrors = validateSlackConfig();
    if (slackErrors.length > 0) {
      console.error('❌ Slack configuration errors:');
      slackErrors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }

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
    
    try {
      this.expressReceiver = new ExpressReceiver({
        signingSecret: slackConfig.signingSecret,
        endpoints: '/slack/events',
        processBeforeResponse: true,
      });
      console.log('✅ ExpressReceiver created');

      this.slackApp = new SlackApp({
        token: slackConfig.botToken,
        signingSecret: slackConfig.signingSecret,
        receiver: this.expressReceiver,
        logLevel: 'DEBUG'
      });
      console.log('✅ Slack app initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Slack:', error);
      throw error;
    }
  }

  private initializeExpress(): void {
    console.log('🔧 Initializing Express...');
    
    try {
      this.app = this.expressReceiver.app;
      console.log('✅ Express app obtained from receiver');
      
      // Add JSON parsing
      this.app.use(express.json());
      this.app.use(express.urlencoded({ extended: true }));
      
      // Simple request logging
      this.app.use((req, res, next) => {
        console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
        next();
      });

      // CORS
      this.app.use((_req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        next();
      });

      console.log('✅ Express configured');
    } catch (error) {
      console.error('❌ Failed to initialize Express:', error);
      throw error;
    }
  }

  // Add test routes FIRST to verify basic Express functionality
  private setupTestRoutes(): void {
    console.log('🧪 Setting up test routes...');
    
    try {
      // Basic connectivity test
      this.app.get('/ping', (req, res) => {
        console.log('🏓 Ping received');
        res.json({ 
          status: 'pong', 
          timestamp: new Date().toISOString(),
          message: 'Server is working!'
        });
      });

      // Slack connectivity test
      this.app.post('/test-slack-connection', (req, res) => {
        console.log('🧪 TEST CONNECTION ENDPOINT HIT:', {
          body: req.body,
          headers: {
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent']
          },
          timestamp: new Date().toISOString()
        });
        res.json({ 
          success: true, 
          message: 'Server is reachable!',
          receivedData: req.body,
          timestamp: new Date().toISOString()
        });
      });

      this.app.post('/test-ai-dm', express.json(), async (req, res) => {
        try {
          const { message, userId, channelId } = req.body;
          
          if (!message || !userId) {
            return res.status(400).json({ 
              error: 'message and userId are required',
              example: {
                message: "Production is down! Need immediate help!",
                userId: "U090ZTY9MFA",
                channelId: "C1234567890"
              }
            });
          }
      
          console.log(`🧪 Testing AI DM for message: "${message}"`);
          
          // Import AI service
          const { AIBackendService } = await import('./services/AIBackendService');
          const aiService = new AIBackendService();
          
          // Test the classification
          const result = await aiService.testClassifyMessage(
            message,
            userId,
            channelId || 'test-channel'
          );
          
          console.log('🎯 AI Classification:', {
            should_notify: result.should_notify,
            category: result.category,
            confidence: result.confidence
          });
          
          // If AI says notify, send a DM
          if (result.should_notify) {
            console.log('🚨 Message classified as IMPORTANT - sending DM...');
            
            try {
              const dmResult = await this.slackApp.client.chat.postMessage({
                channel: userId, // Send DM to user
                text: `🧠 *Smart Notification Alert*`,
                blocks: [
                  {
                    type: 'section',
                    text: {
                      type: 'mrkdwn',
                      text: `🚨 *AI detected an important message!*\n\n*Category:* ${result.category.toUpperCase()}\n*Confidence:* ${result.confidence}%`
                    }
                  },
                  {
                    type: 'section',
                    text: {
                      type: 'mrkdwn',
                      text: `> ${message}`
                    }
                  },
                  {
                    type: 'context',
                    elements: [
                      {
                        type: 'mrkdwn',
                        text: `💡 *AI Reasoning:* ${result.reasoning}`
                      }
                    ]
                  },
                  {
                    type: 'actions',
                    elements: [
                      {
                        type: 'button',
                        text: {
                          type: 'plain_text',
                          text: '✅ Got it'
                        },
                        action_id: 'acknowledge_test_dm'
                      }
                    ]
                  }
                ]
              });
              
              console.log('✅ DM sent successfully:', dmResult.ok);
              
              res.json({
                success: true,
                classification: result,
                dm_sent: true,
                message: 'AI classified as important and DM was sent!',
                dm_ts: dmResult.ts
              });
              
            } catch (dmError) {
              console.error('❌ Failed to send DM:', dmError);
              res.json({
                success: true,
                classification: result,
                dm_sent: false,
                dm_error: dmError.message,
                message: 'AI classified as important but DM failed'
              });
            }
            
          } else {
            console.log('🔕 Message classified as NOT IMPORTANT - no DM sent');
            res.json({
              success: true,
              classification: result,
              dm_sent: false,
              message: 'AI classified as not important - no DM needed'
            });
          }
          
        } catch (error) {
          console.error('❌ AI DM test failed:', error);
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      });
      
      // Test UI for easy testing
      this.app.get('/test-ai-dm-ui', (req, res) => {
        res.send(`
          <html>
            <head>
              <title>🧠 AI DM Testing</title>
              <style>
                body { font-family: Arial; padding: 20px; max-width: 800px; margin: 0 auto; }
                .test-section { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; }
                button { padding: 12px 20px; margin: 8px; background: #4A154B; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; }
                button:hover { background: #611f69; }
                textarea { width: 100%; height: 80px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: Arial; }
                input[type="text"] { width: 300px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
                #result { margin-top: 20px; padding: 15px; border-radius: 5px; }
                .success { background: #d4edda; color: #155724; }
                .error { background: #f8d7da; color: #721c24; }
                .info { background: #d1ecf1; color: #0c5460; }
              </style>
            </head>
            <body>
              <h1>🧠 AI Smart Notification Testing</h1>
              <p>Test how the AI classifies messages and sends DMs for important ones.</p>
              
              <div class="test-section">
                <h3>📝 Custom Message Test</h3>
                <textarea id="customMessage" placeholder="Enter your test message here...">Production database is down! All services affected. Need immediate attention!</textarea><br>
                <label>User ID: </label>
                <input type="text" id="userId" value="U090ZTY9MFA" placeholder="Your Slack User ID"><br><br>
                <button onclick="testCustom()">🧪 Test AI Classification & DM</button>
              </div>
              
              <div class="test-section">
                <h3>⚡ Quick Test Examples</h3>
                <p>Click any button to test with pre-built scenarios:</p>
                
                <button onclick="testMessage('🚨 URGENT: Production is down! Payment system not working. Need immediate help!')">
                  🚨 Urgent Alert
                </button>
                
                <button onclick="testMessage('The deployment pipeline failed. Can someone help debug this issue?')">
                  ⚠️ Technical Issue
                </button>
                
                <button onclick="testMessage('Meeting reminder: All-hands at 3 PM today in the main conference room.')">
                  📅 Meeting Notice
                </button>
                
                <button onclick="testMessage('Anyone want to grab coffee? There\\'s a new place down the street.')">
                  ☕ Social Chat
                </button>
                
                <button onclick="testMessage('Great job on the presentation today! Really well done.')">
                  👏 Casual Praise
                </button>
              </div>
              
              <div id="result"></div>
              
              <script>
                async function testMessage(message, customUserId = null) {
                  const resultDiv = document.getElementById('result');
                  const userId = customUserId || document.getElementById('userId').value;
                  
                  if (!userId) {
                    alert('Please enter your Slack User ID');
                    return;
                  }
                  
                  resultDiv.innerHTML = '<div class="info">🤖 AI is analyzing message and deciding whether to send DM...</div>';
                  
                  try {
                    const response = await fetch('/test-ai-dm', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        message, 
                        userId,
                        channelId: 'test-channel'
                      })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                      const dmStatus = data.dm_sent ? '✅ DM SENT' : '🔕 NO DM';
                      const className = data.dm_sent ? 'success' : 'info';
                      
                      resultDiv.innerHTML = \`
                        <div class="\${className}">
                          <h3>\${dmStatus}</h3>
                          <p><strong>Message:</strong> "\${message}"</p>
                          <p><strong>AI Decision:</strong> \${data.classification.should_notify ? 'NOTIFY' : 'FILTER'}</p>
                          <p><strong>Category:</strong> \${data.classification.category.toUpperCase()}</p>
                          <p><strong>Confidence:</strong> \${data.classification.confidence}%</p>
                          <p><strong>Reasoning:</strong> \${data.classification.reasoning}</p>
                          <p><strong>Result:</strong> \${data.message}</p>
                          \${data.dm_sent ? '<p><strong>✅ Check your Slack DMs!</strong></p>' : ''}
                        </div>
                      \`;
                    } else {
                      resultDiv.innerHTML = \`<div class="error">❌ Error: \${data.error}</div>\`;
                    }
                  } catch (error) {
                    resultDiv.innerHTML = \`<div class="error">❌ Network Error: \${error.message}</div>\`;
                  }
                }
                
                function testCustom() {
                  const message = document.getElementById('customMessage').value;
                  const userId = document.getElementById('userId').value;
                  
                  if (message.trim() && userId.trim()) {
                    testMessage(message, userId);
                  } else {
                    alert('Please enter both a message and user ID');
                  }
                }
              </script>
            </body>
          </html>
        `);
      });

      // Health check
      this.app.get('/health', (req, res) => {
        console.log('❤️ Health check requested');
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          slack_configured: !!slackConfig.botToken,
          environment: appConfig.server.env
        });
      });

      console.log('✅ Test routes set up');
    } catch (error) {
      console.error('❌ Failed to setup test routes:', error);
      throw error;
    }
  }

  // Add Slack event debugging
  private setupSlackDebugHandlers(): void {
    console.log('🎯 Setting up Slack debug handlers...');
    
    try {
      // Log ALL incoming Slack requests - use proper Express middleware
      this.app.use((req, res, next) => {
        if (req.path.startsWith('/slack/')) {
          console.log('🚨 SLACK REQUEST:', {
            method: req.method,
            path: req.path,
            contentType: req.headers['content-type'],
            hasSignature: !!req.headers['x-slack-signature'],
            hasTimestamp: !!req.headers['x-slack-request-timestamp'],
            bodySize: req.body ? JSON.stringify(req.body).length : 0
          });
        }
        next();
      });

      // Catch ALL Slack events
      this.slackApp.use(async ({ event, next, body }) => {
        console.log('🔔 SLACK EVENT:', {
          bodyType: body?.type,
          eventType: event?.type,
          subtype: event?.subtype,
          user: event?.user,
          channel: event?.channel,
          hasText: !!event?.text
        });
        await next();
      });

      // Handle URL verification (happens during Slack app setup)
      this.slackApp.use(async ({ body, next }) => {
        if (body?.type === 'url_verification') {
          console.log('✅ URL VERIFICATION RECEIVED - Slack is connecting!');
        }
        await next();
      });

      // Simple message test
      this.slackApp.message(async ({ message, client }) => {
        if (!message.bot_id && message.text) {
          console.log('💬 USER MESSAGE:', {
            user: message.user,
            channel: message.channel,
            text: message.text.substring(0, 50) + '...'
          });
          
          // Auto-respond to test
          if (message.text.toLowerCase().includes('test bot')) {
            console.log('🧪 Responding to test command...');
            try {
              await client.chat.postMessage({
                channel: message.channel,
                text: `✅ Bot is working! Time: ${new Date().toLocaleTimeString()}`
              });
              console.log('✅ Test response sent');
            } catch (error) {
              console.error('❌ Failed to send test response:', error);
            }
          }
        }
      });

      // App mention test
      this.slackApp.event('app_mention', async ({ event, client }) => {
        console.log('📢 BOT MENTIONED:', event.text);
        try {
          await client.chat.postMessage({
            channel: event.channel,
            thread_ts: event.ts,
            text: `Hello! I'm alive! 🤖 Time: ${new Date().toLocaleTimeString()}`
          });
          console.log('✅ Mention response sent');
        } catch (error) {
          console.error('❌ Failed to respond to mention:', error);
        }
      });

      console.log('✅ Slack debug handlers set up');
    } catch (error) {
      console.error('❌ Failed to setup Slack handlers:', error);
      throw error;
    }
  }

  private initializeControllers(): void {
    console.log('🔧 Initializing controllers...');
    
    try {
      this.oauthController = new SlackOAuthController(this.slackApp, this.expressReceiver);
      this.eventController = new SlackEventController(this.slackApp, this.expressReceiver);
      this.interactionController = new SlackInteractionController(this.slackApp, this.expressReceiver);

      this.oauthController.register();
      this.eventController.register();
      this.interactionController.register();

      console.log('✅ Controllers initialized - your original handlers are active');
    } catch (error) {
      console.error('❌ Failed to initialize controllers:', error);
      // Don't throw - let the app continue with basic functionality
      console.warn('⚠️ Continuing without controllers...');
    }
  }

  private setupMainRoutes(): void {
    console.log('🔧 Setting up main routes...');
    
    try {
      // OAuth callback
      this.app.get('/slack/oauth/callback', async (req, res) => {
        try {
          console.log('🔑 OAuth callback received');
          const { code, error } = req.query;
      
          if (error) {
            console.error('❌ OAuth error:', error);
            return res.status(400).send('OAuth error: ' + error);
          }
      
          if (!code) {
            return res.status(400).send('Missing authorization code');
          }
      
          const result = await this.slackApp.client.oauth.v2.access({
            client_id: slackConfig.clientId,
            client_secret: slackConfig.clientSecret,
            code: code as string,
            redirect_uri: slackConfig.redirectUri
          });
      
          if (!result.ok) {
            throw new Error(`OAuth exchange failed: ${result.error}`);
          }
      
          console.log('✅ OAuth success:', {
            team_id: result.team?.id,
            user_id: result.authed_user?.id
          });
      
          res.send(`
            <html>
              <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>🎉 Installation Successful!</h1>
                <p>Smart Notifications is now installed!</p>
                <h3>🧪 Test the bot:</h3>
                <ol style="text-align: left; max-width: 400px; margin: 20px auto;">
                  <li>Go to any Slack channel where the bot is present</li>
                  <li>Type: <code>test bot</code></li>
                  <li>Or mention the bot: <code>@YourBot hello</code></li>
                  <li>You should get a response!</li>
                </ol>
                <a href="slack://app" style="color: #4A154B;">Open Slack</a>
              </body>
            </html>
          `);
      
        } catch (error) {
          console.error('❌ OAuth callback error:', error);
          res.status(500).send('Installation failed: ' + (error as Error).message);
        }
      });

      // Install endpoint
      this.app.get('/slack/install', (req, res) => {
        try {
          const installUrl = this.oauthController.getInstallUrl();
          console.log('🔗 Redirecting to install URL');
          res.redirect(installUrl);
        } catch (error) {
          console.error('❌ Install redirect failed:', error);
          res.status(500).send('Install redirect failed');
        }
      });

      // Landing page
      this.app.get('/', (req, res) => {
        res.send(`
          <html>
            <head>
              <title>Smart Notifications - Debug Mode</title>
              <style>
                body { font-family: Arial; padding: 20px; max-width: 800px; margin: 0 auto; }
                .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
                .success { background: #d4edda; color: #155724; }
                .warning { background: #fff3cd; color: #856404; }
                .error { background: #f8d7da; color: #721c24; }
                .code { background: #f8f9fa; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
              </style>
            </head>
            <body>
              <h1>🧠 Smart Notifications - Debug Mode</h1>
              
              <div class="status ${slackConfig.botToken ? 'success' : 'error'}">
                <strong>Bot Token:</strong> ${slackConfig.botToken ? '✅ Configured' : '❌ Missing'}
              </div>
              
              <div class="status ${slackConfig.signingSecret ? 'success' : 'error'}">
                <strong>Signing Secret:</strong> ${slackConfig.signingSecret ? '✅ Configured' : '❌ Missing'}
              </div>

              <h3>🧪 Test Server Connectivity</h3>
              <p>Test if this server is working:</p>
              <ul>
                <li><a href="/ping" target="_blank">Ping Test</a></li>
                <li><a href="/health" target="_blank">Health Check</a></li>
              </ul>

              <h3>🔗 For Slack App Configuration</h3>
              <p><strong>Events URL:</strong> <span class="code">https://your-ngrok-url.ngrok.io/slack/events</span></p>
              <p><strong>OAuth Redirect URL:</strong> <span class="code">https://your-ngrok-url.ngrok.io/slack/oauth/callback</span></p>

              <h3>🚀 Install & Test</h3>
              <p><a href="/slack/install" style="display: inline-block; padding: 15px 30px; background: #4A154B; color: white; text-decoration: none; border-radius: 5px;">Install App to Slack</a></p>
              
              <h3>📝 Testing Steps</h3>
              <ol>
                <li>Make sure you have ngrok running: <span class="code">ngrok http 3000</span></li>
                <li>Update your Slack app's Event Subscriptions URL</li>
                <li>Install the app using the button above</li>
                <li>In any Slack channel, type: <span class="code">test bot</span></li>
                <li>Check this terminal for logs</li>
              </ol>
            </body>
          </html>
        `);
      });

      console.log('✅ Main routes set up');
    } catch (error) {
      console.error('❌ Failed to setup main routes:', error);
      throw error;
    }
  }

  private setupErrorHandling(): void {
    console.log('🔧 Setting up error handling...');
    
    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('❌ Express error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
      });
      res.status(500).json({ 
        success: false, 
        error: error.message,
        path: req.path
      });
    });

    // 404 handler
    this.app.use((req: express.Request, res: express.Response) => {
      console.log('❌ 404 Not Found:', req.path);
      res.status(404).json({ 
        success: false, 
        error: 'Endpoint not found', 
        path: req.path,
        availableEndpoints: [
          'GET /',
          'GET /ping', 
          'GET /health',
          'POST /test-slack-connection',
          'GET /slack/install',
          'GET /slack/oauth/callback',
          'POST /slack/events'
        ]
      });
    });

    console.log('✅ Error handling configured');
  }

  public async start(): Promise<void> {
    try {
      console.log('🚀 Starting server...');
      this.server = await this.expressReceiver.start(appConfig.server.port);
      
      console.log(`
🎉 SMART NOTIFICATIONS STARTED SUCCESSFULLY!

🌐 Server: http://localhost:${appConfig.server.port}
🧪 Test connectivity: curl http://localhost:${appConfig.server.port}/ping
🔍 Manual test: curl -X POST http://localhost:${appConfig.server.port}/test-slack-connection

📱 For Slack Integration:
1. Run: ngrok http ${appConfig.server.port}
2. Update Slack app Event Subscriptions URL to: https://YOUR-NGROK-URL/slack/events
3. Install: http://localhost:${appConfig.server.port}/slack/install

✅ Ready for testing!
      `);

      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    console.log('🛑 Shutting down gracefully...');
    if (this.server) {
      await this.expressReceiver.stop();
      console.log('✅ Server stopped');
      process.exit(0);
    }
  }

  // Expose methods for external use
  public getSlackApp(): App { return this.slackApp; }
  public getExpressApp(): express.Application { return this.app; }
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
smartNotificationsApp.start().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});

export default smartNotificationsApp;