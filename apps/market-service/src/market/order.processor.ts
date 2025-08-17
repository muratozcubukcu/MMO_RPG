import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { MarketService } from './market.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface OrderMatchJob {
  orderId: string;
}

@Processor('market-orders')
export class OrderProcessor {
  private readonly logger = new Logger(OrderProcessor.name);
  private readonly wsNotifierUrl: string;

  constructor(
    private readonly marketService: MarketService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.wsNotifierUrl = this.configService.get<string>(
      'WS_NOTIFIER_URL',
      'http://ws-notifier:3007',
    );
  }

  @Process('match-order')
  async processOrderMatching(job: Job<OrderMatchJob>) {
    const { orderId } = job.data;
    
    this.logger.log(`Processing order matching for order ${orderId}`);

    try {
      const matches = await this.marketService.matchOrders(orderId);

      if (matches.length > 0) {
        this.logger.log(`Order ${orderId} matched with ${matches.length} orders`);

        // Emit WebSocket events for all participants
        for (const match of matches) {
          await this.emitTradeEvent(match);
        }
      } else {
        this.logger.log(`No matches found for order ${orderId}`);
      }

      return { success: true, matches: matches.length };
    } catch (error) {
      this.logger.error(`Failed to process order matching for ${orderId}:`, error);
      throw error;
    }
  }

  private async emitTradeEvent(match: any) {
    try {
      const tradeEvent = {
        type: 'TRADE_EXECUTED',
        orderId: match.orderId,
        matchedOrderId: match.matchedOrderId,
        price: match.price,
        quantity: match.quantity,
        itemInstanceId: match.itemInstanceId,
        timestamp: new Date().toISOString(),
      };

      // Emit to both buyer and seller
      await Promise.all([
        this.emitToUser(match.buyerId, tradeEvent),
        this.emitToUser(match.sellerId, tradeEvent),
        this.emitToMarket(match.itemInstanceId, tradeEvent),
      ]);
    } catch (error) {
      this.logger.error(`Failed to emit trade event:`, error);
    }
  }

  private async emitToUser(userId: string, event: any) {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.wsNotifierUrl}/emit`, {
          channel: `user:${userId}`,
          events: [event],
        }),
      );
    } catch (error) {
      this.logger.warn(`Failed to emit to user ${userId}:`, error.message);
    }
  }

  private async emitToMarket(itemInstanceId: string, event: any) {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.wsNotifierUrl}/emit`, {
          channel: `market:${itemInstanceId}`,
          events: [event],
        }),
      );
    } catch (error) {
      this.logger.warn(`Failed to emit to market channel:`, error.message);
    }
  }
}
