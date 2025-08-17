import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { MarketService } from './market.service';

@Resolver('Market')
export class MarketResolver {
  constructor(private readonly marketService: MarketService) {}

  @Query()
  async orderBook(
    @Args('itemInstanceId', { nullable: true }) itemInstanceId?: string,
    @Args('limit', { defaultValue: 50 }) limit?: number,
  ) {
    return this.marketService.getOrderBook(itemInstanceId, limit);
  }

  @Query()
  async userOrders(
    @Args('status', { nullable: true }) status?: string,
    @Args('limit', { defaultValue: 20 }) limit?: number,
    @Context() context?: any,
  ) {
    const userId = context.req?.user?.userId;
    if (!userId) {
      throw new Error('Authentication required');
    }

    return this.marketService.getUserOrders(userId, status, limit);
  }

  @Query()
  async tradeHistory(
    @Args('itemInstanceId', { nullable: true }) itemInstanceId?: string,
    @Args('limit', { defaultValue: 50 }) limit?: number,
  ) {
    return this.marketService.getTradeHistory(itemInstanceId, limit);
  }

  @Query()
  async marketStats(@Args('itemInstanceId', { nullable: true }) itemInstanceId?: string) {
    return this.marketService.getMarketStats(itemInstanceId);
  }

  @Mutation()
  async createOrder(
    @Args('itemInstanceId') itemInstanceId: string,
    @Args('type') type: 'LIMIT' | 'AUCTION',
    @Args('side') side: 'BUY' | 'SELL',
    @Args('price') price: number,
    @Args('quantity') quantity: number,
    @Args('expiresAt', { nullable: true }) expiresAt?: string,
    @Context() context?: any,
  ) {
    const userId = context.req?.user?.userId;
    if (!userId) {
      throw new Error('Authentication required');
    }

    return this.marketService.createOrder({
      userId,
      itemInstanceId,
      type,
      side,
      price,
      quantity,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
  }

  @Mutation()
  async cancelOrder(
    @Args('orderId') orderId: string,
    @Context() context?: any,
  ) {
    const userId = context.req?.user?.userId;
    if (!userId) {
      throw new Error('Authentication required');
    }

    return this.marketService.cancelOrder(orderId, userId);
  }
}
