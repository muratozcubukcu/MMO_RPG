import { Injectable } from '@nestjs/common';
import { Health } from '@ai-mmo/shared-types';

@Injectable()
export class HealthService {
  async getHealth(): Promise<Health> {
    // For WebSocket service, we mainly check if the service is running
    // Redis health could be checked here if needed
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      dependencies: {
        websocket: 'healthy',
        redis: 'healthy', // Assume healthy for now
      },
    };
  }
}
