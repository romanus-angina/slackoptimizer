import express from 'express';
import SlackBolt, { App, ExpressReceiver } from '@slack/bolt';
const { App: SlackApp, ExpressReceiver: ExpressReceiverClass } = SlackBolt;
import { appConfig } from './config/app';
import { slackConfig, validateSlackConfig } from './config/slack';
import { backendConfig, validateBackendConfig } from './config/backend';

class SmartNotificationsApp {
  private app!: express.Application;
  private slackApp!: App;
  private expressReceiver!: ExpressReceiver;
  private server: any;

  constructor() {
    this.validateConfiguration();
    this.initializeExpress();
    this.initializeSlack();
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
    // Create ExpressReceiver first
    this.expressReceiver = new ExpressReceiverClass({
      clientId: slackConfig.clientId,
      clientSecret: slackConfig.clientSecret,
      signingSecret: slackConfig.signingSecret,
      
      // For development - you'll implement proper token storage later
      installationStore: {
        storeInstallation: async (installation) => {
          console.log('Installation stored:', installation.team?.id);
          // TODO: Implement proper installation storage
        },
        fetchInstallation: async (installQuery) => {
          console.log('Fetching installation for:', installQuery.teamId);
          // TODO: Implement proper installation retrieval
          return {
            team: { id: installQuery.teamId || '' },
            enterprise: undefined,
            user: { id: '', token: undefined, scopes: [] },
            bot: {
              token: slackConfig.botToken,
              scopes: slackConfig.scopes,
              id: 'bot-id',
              userId: 'bot-user-id'
            }
          };
        },
        deleteInstallation: async (installQuery) => {
          console.log('Deleting installation for:', installQuery.teamId);
          // TODO: Implement proper installation deletion
        }
      }
    });

    // Create SlackApp with the ExpressReceiver and bot token
    this.slackApp = new SlackApp({
      receiver: this.expressReceiver,
      token: slackConfig.botToken
    });

    console.log('Slack app initialized');
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

    // Slack endpoints - using ExpressReceiver's router
    this.app.use('/slack/events', this.expressReceiver.router);

    // API routes will be added here later
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

Server: http://${appConfig.server.host}:${appConfig.server.port}
Environment: ${appConfig.server.env}
Health Check: http://${appConfig.server.host}:${appConfig.server.port}/health

Slack Endpoints:
  Events: http://${appConfig.server.host}:${appConfig.server.port}/slack/events
  OAuth: http://${appConfig.server.host}:${appConfig.server.port}/slack/oauth

Backend API: ${backendConfig.baseUrl}
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

  // Expose the Slack app for use by controllers
  public getSlackApp(): App {
    return this.slackApp;
  }

  // Expose the Express app for additional route mounting
  public getExpressApp(): express.Application {
    return this.app;
  }
}

// Start the application
const smartNotificationsApp = new SmartNotificationsApp();
smartNotificationsApp.start().catch(console.error);

export default smartNotificationsApp;