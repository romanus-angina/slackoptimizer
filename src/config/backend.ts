import { config } from 'dotenv';

config();

export const backendConfig = {
  // Base URL for your cofounder's backend API
  baseUrl: process.env.BACKEND_API_URL || 'http://localhost:8000',
  
  // API endpoints
  endpoints: {
    // User management
    users: '/api/v1/users',
    userSettings: '/api/v1/users/{user_id}/settings',
    
    // Message classification
    classify: '/api/v1/classify',
    batchClassify: '/api/v1/classify/batch',
    
    // Analytics
    analytics: '/api/v1/analytics/{user_id}',
    channelAnalytics: '/api/v1/analytics/{user_id}/channels',
    
    // Testing
    testClassify: '/api/v1/test/classify',
    
    // Health check
    health: '/api/v1/health'
  },
  
  // Authentication
  auth: {
    apiKey: process.env.BACKEND_API_KEY || '',
    timeout: 30000, // 30 seconds
    retries: 3
  },
  
  // Request defaults
  defaults: {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'SlackApp/1.0'
    }
  }
};

// Helper to build full URLs
export function buildBackendUrl(endpoint: string, params: Record<string, string> = {}): string {
  let url = backendConfig.baseUrl + endpoint;
  
  // Replace path parameters
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`{${key}}`, encodeURIComponent(value));
  });
  
  return url;
}

// Validation helper
export function validateBackendConfig(): string[] {
  const errors: string[] = [];
  
  if (!backendConfig.baseUrl) errors.push('BACKEND_API_URL is required');
  if (!backendConfig.auth.apiKey) errors.push('BACKEND_API_KEY is required');
  
  return errors;
}