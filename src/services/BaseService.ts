import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Base service class for external API integrations
export abstract class BaseService {
  protected client: AxiosInstance;
  protected serviceName: string;

  constructor(baseURL: string, serviceName: string, defaultConfig: AxiosRequestConfig = {}) {
    this.serviceName = serviceName;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      ...defaultConfig
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        this.logRequest(config);
        return config;
      },
      (error) => {
        this.logError('Request failed', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        this.logResponse(response);
        return response;
      },
      (error) => {
        this.logError('Response failed', error);
        return Promise.reject(this.handleError(error));
      }
    );
  }

  protected async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(endpoint, config);
    return response.data;
  }

  protected async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(endpoint, data, config);
    return response.data;
  }

  protected async put<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(endpoint, data, config);
    return response.data;
  }

  protected async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(endpoint, config);
    return response.data;
  }

  // Retry mechanism for failed requests
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: Error = new Error('Operation failed');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        this.logRetry(attempt, maxRetries, delay);
        await this.delay(delay * attempt); // Exponential backoff
      }
    }

    throw lastError;
  }

  // Utility method for delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper methods for logging
  private logRequest(config: AxiosRequestConfig): void {
    console.log(`[${this.serviceName}] Request:`, {
      method: config.method?.toUpperCase(),
      url: config.url,
      timestamp: new Date().toISOString()
    });
  }

  private logResponse(response: AxiosResponse): void {
    console.log(`[${this.serviceName}] Response:`, {
      status: response.status,
      url: response.config.url,
      timestamp: new Date().toISOString()
    });
  }

  private logError(context: string, error: any): void {
    console.error(`[${this.serviceName}] ${context}:`, {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      timestamp: new Date().toISOString()
    });
  }

  private logRetry(attempt: number, maxRetries: number, delay: number): void {
    console.warn(`[${this.serviceName}] Retry ${attempt}/${maxRetries} after ${delay}ms`);
  }

  // Error handling
  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      return new Error(
        `${this.serviceName} API error: ${error.response.status} - ${error.response.data?.message || error.message}`
      );
    }
    return new Error(error.message);
  }
}