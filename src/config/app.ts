import { config } from 'dotenv';

config();

export const appConfig = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  },
  
  // Feature flags
  features: {
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
    enableTesting: process.env.ENABLE_TESTING === 'true',
    enableOnboarding: process.env.ENABLE_ONBOARDING !== 'false', // default true
    rateLimiting: process.env.ENABLE_RATE_LIMITING === 'true'
  },
  
  // Security
  security: {
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'), // requests per window
  },
  
  // App metadata
  app: {
    name: 'Smart Notifications',
    version: '1.0.0',
    description: 'AI-powered Slack notification filtering'
  }
};

// Helper to check if we're in development
export const isDevelopment = () => appConfig.server.env === 'development';
export const isProduction = () => appConfig.server.env === 'production';