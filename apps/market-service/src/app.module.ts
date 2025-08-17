import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriverConfig, ApolloFederationDriver } from '@nestjs/apollo';
import { BullModule } from '@nestjs/bull';

import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { MarketModule } from './market/market.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // GraphQL Federation Subgraph
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      playground: process.env.NODE_ENV === 'development',
      introspection: true,
    }),

    // Bull Queue for order processing
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_URL?.split('://')[1]?.split(':')[0] || 'redis',
        port: parseInt(process.env.REDIS_URL?.split(':').pop() || '6379'),
      },
    }),

    // Application modules
    PrismaModule,
    HealthModule,
    MarketModule,
  ],
})
export class AppModule {}
