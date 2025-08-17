import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { OllamaService } from '../worldgen/ollama.service';

@Module({
  imports: [HttpModule],
  controllers: [HealthController],
  providers: [HealthService, OllamaService],
})
export class HealthModule {}
