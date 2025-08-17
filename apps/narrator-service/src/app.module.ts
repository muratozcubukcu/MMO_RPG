import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

import { NarratorModule } from './narrator/narrator.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Redis cache
    CacheModule.register({
      isGlobal: true,
      store: redisStore as any,
      host: process.env.REDIS_URL?.split('://')[1]?.split(':')[0] || 'redis',
      port: parseInt(process.env.REDIS_URL?.split(':').pop() || '6379'),
      ttl: 600, // 10 minutes default TTL for narratives
    }),

    // Application modules
    NarratorModule,
    HealthModule,
  ],
})
export class AppModule {}
