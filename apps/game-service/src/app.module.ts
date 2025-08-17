import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { GameModule } from './modules/game.module';
import { AuthModule } from './modules/auth.module';
import { DatabaseModule } from './modules/database.module';
import { RedisModule } from './modules/redis.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    GameModule,
  ],
})
export class AppModule {}