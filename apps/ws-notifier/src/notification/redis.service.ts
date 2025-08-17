import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private subscriber: RedisClientType;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://redis:6379');
    
    this.client = createClient({ url: redisUrl });
    this.subscriber = createClient({ url: redisUrl });

    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error:', err);
    });

    this.subscriber.on('error', (err) => {
      this.logger.error('Redis Subscriber Error:', err);
    });
  }

  async onModuleInit() {
    await this.client.connect();
    await this.subscriber.connect();
    this.logger.log('Connected to Redis');
  }

  async onModuleDestroy() {
    await this.client.disconnect();
    await this.subscriber.disconnect();
    this.logger.log('Disconnected from Redis');
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel, callback);
  }

  async unsubscribe(channel: string): Promise<void> {
    await this.subscriber.unsubscribe(channel);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }
}
