import { BaseService } from './BaseService';
import { backendConfig, buildBackendUrl } from '../config/backend';
import { 
  BackendUser, 
  UserSettings, 
  ClassificationRequest, 
  ClassificationResult, 
  AnalyticsData,
  BackendAPIResponse 
} from '../types/backend';

export class BackendAPIService extends BaseService {
  constructor() {
    super(
      backendConfig.baseUrl,
      'BackendAPI',
      {
        headers: {
          ...backendConfig.defaults.headers,
          'Authorization': `Bearer ${backendConfig.auth.apiKey}`,
        },
        timeout: backendConfig.auth.timeout,
      }
    );
  }

  // User Management
  async createUser(userData: {
    slack_user_id: string;
    team_id: string;
    email: string;
  }): Promise<BackendUser> {
    return this.withRetry(async () => {
      const response = await this.post<BackendAPIResponse<BackendUser>>(
        backendConfig.endpoints.users,
        userData
      );
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create user');
      }
      
      return response.data!;
    });
  }

  async getUser(slackUserId: string, teamId: string): Promise<BackendUser | null> {
    try {
      const response = await this.get<BackendAPIResponse<BackendUser>>(
        `${backendConfig.endpoints.users}/${slackUserId}?team_id=${teamId}`
      );
      
      return response.success ? response.data! : null;
    } catch (error) {
      console.warn(`User ${slackUserId} not found in backend`);
      return null;
    }
  }

  async updateUserSettings(
    slackUserId: string, 
    teamId: string, 
    settings: Partial<UserSettings>
  ): Promise<UserSettings> {
    return this.withRetry(async () => {
      const url = buildBackendUrl(backendConfig.endpoints.userSettings, { 
        user_id: slackUserId 
      });
      
      const response = await this.put<BackendAPIResponse<UserSettings>>(
        `${url}?team_id=${teamId}`,
        settings
      );
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update settings');
      }
      
      return response.data!;
    });
  }

  // Message Classification
  async classifyMessage(request: ClassificationRequest): Promise<ClassificationResult> {
    return this.withRetry(async () => {
      const response = await this.post<BackendAPIResponse<ClassificationResult>>(
        backendConfig.endpoints.classify,
        request
      );
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Classification failed');
      }
      
      return response.data!;
    });
  }

  async classifyBatch(requests: ClassificationRequest[]): Promise<ClassificationResult[]> {
    return this.withRetry(async () => {
      const response = await this.post<BackendAPIResponse<ClassificationResult[]>>(
        backendConfig.endpoints.batchClassify,
        { messages: requests }
      );
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Batch classification failed');
      }
      
      return response.data!;
    });
  }

  // Testing endpoints
  async testClassifyMessage(
    message: string, 
    userId: string, 
    channelId: string
  ): Promise<ClassificationResult> {
    return this.withRetry(async () => {
      const response = await this.post<BackendAPIResponse<ClassificationResult>>(
        backendConfig.endpoints.testClassify,
        {
          message: {
            text: message,
            user_id: userId,
            channel_id: channelId,
            timestamp: new Date().toISOString()
          }
        }
      );
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Test classification failed');
      }
      
      return response.data!;
    });
  }

  // Analytics
  async getUserAnalytics(
    slackUserId: string, 
    teamId: string, 
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<AnalyticsData> {
    const url = buildBackendUrl(backendConfig.endpoints.analytics, { 
      user_id: slackUserId 
    });
    
    const response = await this.get<BackendAPIResponse<AnalyticsData>>(
      `${url}?team_id=${teamId}&period=${period}`
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch analytics');
    }
    
    return response.data!;
  }

  async getChannelAnalytics(
    slackUserId: string, 
    teamId: string,
    channelId?: string
  ): Promise<any> {
    const url = buildBackendUrl(backendConfig.endpoints.channelAnalytics, { 
      user_id: slackUserId 
    });
    
    const queryParams = new URLSearchParams({ team_id: teamId });
    if (channelId) queryParams.append('channel_id', channelId);
    
    const response = await this.get<BackendAPIResponse<any>>(
      `${url}?${queryParams.toString()}`
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch channel analytics');
    }
    
    return response.data!;
  }

  // Health check override
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get<BackendAPIResponse<{ status: string }>>(
        backendConfig.endpoints.health
      );
      return response.success && response.data?.status === 'healthy';
    } catch {
      return false;
    }
  }

  // Helper method to check if backend is available
  async isBackendAvailable(): Promise<boolean> {
    return this.healthCheck();
  }

  // Error recovery - get default settings when backend is unavailable
  getDefaultUserSettings(): UserSettings {
    return {
      notification_level: 'mentions',
      keywords: [],
      channels: {},
      quiet_hours: {
        enabled: false,
        start_time: '22:00',
        end_time: '08:00',
        timezone: 'UTC'
      },
      filters: {
        spam_detection: true,
        duplicate_detection: true,
        importance_threshold: 50
      }
    };
  }
}