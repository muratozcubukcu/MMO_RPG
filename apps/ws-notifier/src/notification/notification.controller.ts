import { Controller, Post, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { GameEvent } from '@ai-mmo/shared-types';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';

export class EmitEventDto {
  channel: string;
  events: GameEvent[];
}

@Controller()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  @Post('emit')
  @HttpCode(HttpStatus.OK)
  async emitEvents(@Body() dto: EmitEventDto): Promise<{ success: boolean; message: string }> {
    try {
      await this.notificationService.emitToChannel(dto.channel, dto.events);
      
      return {
        success: true,
        message: `Emitted ${dto.events.length} events to channel ${dto.channel}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to emit events: ${error.message}`,
      };
    }
  }

  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  async broadcast(@Body() data: { event: string; payload: any }): Promise<{ success: boolean }> {
    try {
      this.notificationGateway.broadcast(data.event, data.payload);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  @Get('stats')
  getStats() {
    return {
      websocket: this.notificationGateway.getStats(),
      channels: {
        active: this.notificationService.getAllChannels(),
        count: this.notificationService.getAllChannels().length,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
