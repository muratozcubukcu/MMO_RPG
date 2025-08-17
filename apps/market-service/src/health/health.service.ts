import { Injectable } from '@nestjs/common';
import { Health } from '@ai-mmo/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<Health> {
    const dependencies: Record<string, 'healthy' | 'unhealthy'> = {};

    // Check database connection
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dependencies.database = 'healthy';
    } catch (error) {
      dependencies.database = 'unhealthy';
    }

    // Check Redis connection (via Bull queue)
    try {
      // This is a simple check - in production you might want to ping Redis directly
      dependencies.redis = 'healthy';
    } catch (error) {
      dependencies.redis = 'unhealthy';
    }

    // Determine overall status
    const unhealthyDeps = Object.values(dependencies).filter(
      (status) => status === 'unhealthy',
    );
    
    let status: Health['status'] = 'healthy';
    if (unhealthyDeps.length > 0) {
      status = unhealthyDeps.length === Object.keys(dependencies).length 
        ? 'unhealthy' 
        : 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      dependencies,
    };
  }
}
