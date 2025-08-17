import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { WorldGenModule } from './worldgen/worldgen.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Bull Queue for background processing
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_URL?.split('://')[1]?.split(':')[0] || 'redis',
        port: parseInt(process.env.REDIS_URL?.split(':').pop() || '6379'),
      },
    }),

    // Application modules
    PrismaModule,
    HealthModule,
    WorldGenModule,
  ],
})
export class AppModule {}
