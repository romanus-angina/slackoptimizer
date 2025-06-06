import { Request, Response } from 'express';
import { SlackUser, SlackInteraction } from '@/types/slack';

// Base controller providing common functionality
export abstract class BaseController {
  protected logRequest(req: Request, action: string): void {
    console.log(`[${this.constructor.name}] ${action}:`, {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });
  }

  protected handleSuccess(res: Response, data: any = {}, message = 'Success'): Response {
    return res.status(200).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  protected handleError(res: Response, error: Error | string, statusCode = 500): Response {
    const errorMessage = error instanceof Error ? error.message : error;
    
    console.error(`[${this.constructor.name}] Error:`, errorMessage);
    
    return res.status(statusCode).json({
      success: false,
      error: {
        message: errorMessage,
        code: statusCode
      },
      timestamp: new Date().toISOString()
    });
  }

  protected extractSlackUser(body: any): SlackUser | null {
    try {
      // Handle different Slack payload structures
      if (body.user) {
        return body.user;
      }
      if (body.event?.user) {
        return { id: body.event.user, name: '', email: '', team_id: body.team_id };
      }
      return null;
    } catch (error) {
      console.warn(`[${this.constructor.name}] Could not extract Slack user:`, error);
      return null;
    }
  }

  protected validateRequiredFields(data: any, fields: string[]): string[] {
    const missing: string[] = [];
    
    fields.forEach(field => {
      if (!data[field]) {
        missing.push(field);
      }
    });
    
    return missing;
  }

  // Async wrapper for handling controller methods
  protected async safeExecute<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      console.error(`[${this.constructor.name}] ${context} failed:`, error);
      return null;
    }
  }
}