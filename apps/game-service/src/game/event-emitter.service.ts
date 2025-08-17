import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { GameEvent } from '@ai-mmo/shared-types';

@Injectable()
export class EventEmitter {
  private readonly logger = new Logger(EventEmitter.name);
  private readonly wsNotifierUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.wsNotifierUrl = this.configService.get<string>(
      'WS_NOTIFIER_URL',
      'http://ws-notifier:3007',
    );
  }

  async emitEvents(worldId: string, userId: string, events: GameEvent[]): Promise<void> {
    try {
      // Emit to world channel (all players in world)
      await this.emitToChannel(`world:${worldId}`, events);
      
      // Emit to user channel (specific player)
      await this.emitToChannel(`user:${userId}`, events);
      
      this.logger.debug(`Emitted ${events.length} events for world ${worldId}, user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to emit events: ${error.message}`);
      // Don't throw - event emission failure shouldn't break gameplay
    }
  }

  private async emitToChannel(channel: string, events: GameEvent[]): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.wsNotifierUrl}/emit`, {
          channel,
          events,
        }, {
          timeout: 5000, // 5 second timeout
        }),
      );
    } catch (error) {
      this.logger.warn(`Failed to emit to channel ${channel}: ${error.message}`);
    }
  }
}
