import { Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { RedisService } from './redis.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationGateway, NotificationService, RedisService],
})
export class NotificationModule {}
