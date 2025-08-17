import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriverConfig, ApolloFederationDriver } from '@nestjs/apollo';

import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { GameModule } from './game/game.module';
import { WorldModule } from './world/world.module';

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

    // Application modules
    PrismaModule,
    HealthModule,
    GameModule,
    WorldModule,
  ],
})
export class AppModule {}
