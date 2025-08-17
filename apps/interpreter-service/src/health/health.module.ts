import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { OllamaService } from '../interpreter/ollama.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [HealthController],
  providers: [HealthService, OllamaService],
})
export class HealthModule {}
