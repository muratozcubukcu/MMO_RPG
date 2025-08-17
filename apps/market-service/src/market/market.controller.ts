import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MarketService, CreateOrderOptions } from './market.service';

export class CreateOrderDto {
  itemInstanceId: string;
  type: 'LIMIT' | 'AUCTION';
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  expiresAt?: string; // ISO date string
}

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body() dto: CreateOrderDto,
    @Headers('x-user-id') userId: string,
  ) {
    const options: CreateOrderOptions = {
      userId,
      itemInstanceId: dto.itemInstanceId,
      type: dto.type,
      side: dto.side,
      price: dto.price,
      quantity: dto.quantity,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    };

    const order = await this.marketService.createOrder(options);
    
    return {
      success: true,
      data: order,
      message: `${dto.side} order created successfully`,
    };
  }

  @Delete('orders/:orderId')
  async cancelOrder(
    @Param('orderId') orderId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.marketService.cancelOrder(orderId, userId);
    
    return result;
  }

  @Get('orderbook')
  async getOrderBook(
    @Query('itemInstanceId') itemInstanceId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(100, Math.max(1, parseInt(limit))) : 50;
    
    const orderBook = await this.marketService.getOrderBook(itemInstanceId, parsedLimit);
    
    return {
      success: true,
      data: orderBook,
    };
  }

  @Get('orders')
  async getUserOrders(
    @Headers('x-user-id') userId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(100, Math.max(1, parseInt(limit))) : 20;
    
    const orders = await this.marketService.getUserOrders(userId, status, parsedLimit);
    
    return {
      success: true,
      data: orders,
    };
  }

  @Get('trades')
  async getTradeHistory(
    @Query('itemInstanceId') itemInstanceId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(100, Math.max(1, parseInt(limit))) : 50;
    
    const trades = await this.marketService.getTradeHistory(itemInstanceId, parsedLimit);
    
    return {
      success: true,
      data: trades,
    };
  }

  @Get('stats')
  async getMarketStats(@Query('itemInstanceId') itemInstanceId?: string) {
    const stats = await this.marketService.getMarketStats(itemInstanceId);
    
    return {
      success: true,
      data: stats,
    };
  }

  @Get('items/:itemInstanceId/orderbook')
  async getItemOrderBook(
    @Param('itemInstanceId') itemInstanceId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(100, Math.max(1, parseInt(limit))) : 50;
    
    const orderBook = await this.marketService.getOrderBook(itemInstanceId, parsedLimit);
    
    return {
      success: true,
      data: orderBook,
    };
  }

  @Get('items/:itemInstanceId/stats')
  async getItemStats(@Param('itemInstanceId') itemInstanceId: string) {
    const stats = await this.marketService.getMarketStats(itemInstanceId);
    
    return {
      success: true,
      data: stats,
    };
  }

  @Get('items/:itemInstanceId/trades')
  async getItemTrades(
    @Param('itemInstanceId') itemInstanceId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Math.min(100, Math.max(1, parseInt(limit))) : 50;
    
    const trades = await this.marketService.getTradeHistory(itemInstanceId, parsedLimit);
    
    return {
      success: true,
      data: trades,
    };
  }
}
