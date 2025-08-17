import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { GameEvent } from '@ai-mmo/shared-types';

export interface NotificationPayload {
  channel: string;
  events: GameEvent[];
  timestamp?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly channelSubscriptions = new Map<string, Set<string>>();

  constructor(private readonly redisService: RedisService) {}

  async subscribeToChannel(socketId: string, channel: string): Promise<void> {
    if (!this.channelSubscriptions.has(channel)) {
      this.channelSubscriptions.set(channel, new Set());
      
      // Subscribe to Redis channel
      await this.redisService.subscribe(channel, (message) => {
        this.handleRedisMessage(channel, message);
      });
      
      this.logger.debug(`Subscribed to Redis channel: ${channel}`);
    }

    this.channelSubscriptions.get(channel)!.add(socketId);
    this.logger.debug(`Socket ${socketId} subscribed to channel ${channel}`);
  }

  async unsubscribeFromChannel(socketId: string, channel: string): Promise<void> {
    const subscribers = this.channelSubscriptions.get(channel);
    if (subscribers) {
      subscribers.delete(socketId);
      
      // If no more subscribers, unsubscribe from Redis
      if (subscribers.size === 0) {
        this.channelSubscriptions.delete(channel);
        await this.redisService.unsubscribe(channel);
        this.logger.debug(`Unsubscribed from Redis channel: ${channel}`);
      }
    }
  }

  async unsubscribeSocket(socketId: string): Promise<void> {
    for (const [channel, subscribers] of this.channelSubscriptions.entries()) {
      if (subscribers.has(socketId)) {
        await this.unsubscribeFromChannel(socketId, channel);
      }
    }
  }

  async emitToChannel(channel: string, events: GameEvent[]): Promise<void> {
    const payload: NotificationPayload = {
      channel,
      events,
      timestamp: new Date().toISOString(),
    };

    // Publish to Redis for distribution across instances
    await this.redisService.publish(`ws:${channel}`, JSON.stringify(payload));
    
    this.logger.debug(`Published ${events.length} events to channel ${channel}`);
  }

  private handleRedisMessage(channel: string, message: string): void {
    try {
      const payload: NotificationPayload = JSON.parse(message);
      const subscribers = this.channelSubscriptions.get(channel);
      
      if (subscribers && subscribers.size > 0) {
        // Emit to all subscribers in this instance
        this.emitToSubscribers(channel, payload);
      }
    } catch (error) {
      this.logger.error(`Failed to parse Redis message for channel ${channel}:`, error);
    }
  }

  private emitToSubscribers(channel: string, payload: NotificationPayload): void {
    // This will be called by the gateway to emit to actual WebSocket connections
    // The gateway will register a callback here
  }

  // Callback registration for the gateway
  private emitCallback?: (channel: string, payload: NotificationPayload) => void;

  setEmitCallback(callback: (channel: string, payload: NotificationPayload) => void): void {
    this.emitCallback = callback;
  }

  // Method called by Redis message handler
  private emitToWebSockets(channel: string, payload: NotificationPayload): void {
    if (this.emitCallback) {
      this.emitCallback(channel, payload);
    }
  }

  // Override the emit method to use the callback
  private emitToSubscribers2(channel: string, payload: NotificationPayload): void {
    this.emitToWebSockets(channel, payload);
  }

  getChannelSubscribers(channel: string): string[] {
    return Array.from(this.channelSubscriptions.get(channel) || []);
  }

  getAllChannels(): string[] {
    return Array.from(this.channelSubscriptions.keys());
  }
}
