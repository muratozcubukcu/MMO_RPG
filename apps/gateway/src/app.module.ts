import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose } from '@apollo/gateway';

import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ProxyModule } from './proxy/proxy.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // GraphQL Federation Gateway
    GraphQLModule.forRoot<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      gateway: {
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: [
            {
              name: 'game',
              url: process.env.GAME_SERVICE_URL + '/graphql',
            },
            {
              name: 'inventory',
              url: process.env.INVENTORY_SERVICE_URL + '/graphql',
            },
            {
              name: 'market',
              url: process.env.MARKET_SERVICE_URL + '/graphql',
            },
          ],
        }),
      },
    }),

    // Application modules
    PrismaModule,
    AuthModule,
    HealthModule,
    ProxyModule,
  ],
})
export class AppModule {}
