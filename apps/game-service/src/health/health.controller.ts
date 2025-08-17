import { Controller, Get } from '@nestjs/common';
import { Health } from '@ai-mmo/shared-types';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('healthz')
  async getHealth(): Promise<Health> {
    return this.healthService.getHealth();
  }

  @Get('health')
  async getHealthAlias(): Promise<Health> {
    return this.healthService.getHealth();
  }
}
