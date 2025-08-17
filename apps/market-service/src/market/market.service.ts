import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { EscrowService } from './escrow.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateOrderOptions {
  userId: string;
  itemInstanceId: string;
  type: 'LIMIT' | 'AUCTION';
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  expiresAt?: Date;
}

export interface OrderMatchResult {
  orderId: string;
  matchedOrderId: string;
  price: number;
  quantity: number;
  buyerId: string;
  sellerId: string;
  itemInstanceId: string;
}

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
    @InjectQueue('market-orders') private orderQueue: Queue,
  ) {}

  async createOrder(options: CreateOrderOptions) {
    const { userId, itemInstanceId, type, side, price, quantity, expiresAt } = options;

    // Validate item exists and user owns it (for sell orders)
    if (side === 'SELL') {
      const inventoryItem = await this.prisma.inventoryItem.findFirst({
        where: {
          inventory: { userId },
          itemInstanceId,
          quantity: { gte: quantity },
        },
        include: {
          itemInstance: {
            include: { archetype: true },
          },
        },
      });

      if (!inventoryItem) {
        throw new BadRequestException('Item not found or insufficient quantity');
      }

      // Check if item is bound
      if (inventoryItem.itemInstance.boundToUserId && inventoryItem.itemInstance.boundToUserId !== userId) {
        throw new BadRequestException('Cannot sell bound items');
      }
    }

    // Validate user has sufficient currency for buy orders
    if (side === 'BUY') {
      const wallet = await this.prisma.wallet.findFirst({
        where: {
          userId,
          currency: { code: 'GOLD' },
        },
      });

      const totalCost = price * quantity;
      if (!wallet || wallet.balance < totalCost) {
        throw new BadRequestException('Insufficient gold balance');
      }
    }

    // Create the order
    const order = await this.prisma.order.create({
      data: {
        userId,
        itemInstanceId,
        type,
        side,
        price,
        quantity,
        remainingQuantity: quantity,
        status: 'ACTIVE',
        expiresAt,
      },
      include: {
        itemInstance: {
          include: { archetype: true },
        },
        user: {
          select: { username: true },
        },
      },
    });

    // Put item in escrow for sell orders
    if (side === 'SELL') {
      await this.escrowService.createEscrow({
        orderId: order.id,
        sellerId: userId,
        itemInstanceId,
        quantity,
      });
    }

    // Queue order matching job
    await this.orderQueue.add('match-order', {
      orderId: order.id,
    });

    this.logger.log(`Created ${side} order ${order.id} for ${quantity}x ${order.itemInstance.archetype.name} at ${price} gold`);

    return order;
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        itemInstance: {
          include: { archetype: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new BadRequestException('Cannot cancel another user\'s order');
    }

    if (order.status !== 'ACTIVE') {
      throw new BadRequestException('Order is not active');
    }

    // Update order status
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    // Release escrow for sell orders
    if (order.side === 'SELL') {
      await this.escrowService.releaseEscrow(orderId);
    }

    this.logger.log(`Cancelled order ${orderId}`);

    return { success: true, message: 'Order cancelled successfully' };
  }

  async getOrderBook(itemInstanceId?: string, limit: number = 50) {
    const where: any = {
      status: 'ACTIVE',
    };

    if (itemInstanceId) {
      where.itemInstanceId = itemInstanceId;
    }

    const [buyOrders, sellOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: { ...where, side: 'BUY' },
        orderBy: { price: 'desc' }, // Highest buy prices first
        take: limit,
        include: {
          itemInstance: {
            include: { archetype: true },
          },
          user: {
            select: { username: true },
          },
        },
      }),
      this.prisma.order.findMany({
        where: { ...where, side: 'SELL' },
        orderBy: { price: 'asc' }, // Lowest sell prices first
        take: limit,
        include: {
          itemInstance: {
            include: { archetype: true },
          },
          user: {
            select: { username: true },
          },
        },
      }),
    ]);

    return {
      buyOrders,
      sellOrders,
      spread: sellOrders[0] && buyOrders[0] ? sellOrders[0].price - buyOrders[0].price : null,
    };
  }

  async getUserOrders(userId: string, status?: string, limit: number = 20) {
    const where: any = { userId };

    if (status) {
      where.status = status.toUpperCase();
    }

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        itemInstance: {
          include: { archetype: true },
        },
      },
    });
  }

  async getTradeHistory(itemInstanceId?: string, limit: number = 50) {
    const where: any = {};

    if (itemInstanceId) {
      where.order = { itemInstanceId };
    }

    return this.prisma.orderFill.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        order: {
          include: {
            itemInstance: {
              include: { archetype: true },
            },
          },
        },
        counterpartyOrder: {
          include: {
            user: {
              select: { username: true },
            },
          },
        },
      },
    });
  }

  async getMarketStats(itemInstanceId?: string) {
    const where: any = {};
    
    if (itemInstanceId) {
      where.order = { itemInstanceId };
    }

    // Get recent trade data
    const recentTrades = await this.prisma.orderFill.findMany({
      where: {
        ...where,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentTrades.length === 0) {
      return {
        volume24h: 0,
        avgPrice24h: 0,
        priceChange24h: 0,
        trades24h: 0,
      };
    }

    const volume24h = recentTrades.reduce((sum, trade) => sum + (trade.price * trade.quantity), 0);
    const avgPrice24h = recentTrades.reduce((sum, trade) => sum + trade.price, 0) / recentTrades.length;
    
    // Calculate price change (compare first and last trade)
    const oldestTrade = recentTrades[recentTrades.length - 1];
    const newestTrade = recentTrades[0];
    const priceChange24h = newestTrade.price - oldestTrade.price;

    return {
      volume24h,
      avgPrice24h: Math.round(avgPrice24h * 100) / 100,
      priceChange24h: Math.round(priceChange24h * 100) / 100,
      trades24h: recentTrades.length,
    };
  }

  async matchOrders(orderId: string): Promise<OrderMatchResult[]> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        itemInstance: {
          include: { archetype: true },
        },
      },
    });

    if (!order || order.status !== 'ACTIVE' || order.remainingQuantity <= 0) {
      return [];
    }

    // Find matching orders
    const matchingOrders = await this.prisma.order.findMany({
      where: {
        itemInstanceId: order.itemInstanceId,
        side: order.side === 'BUY' ? 'SELL' : 'BUY',
        status: 'ACTIVE',
        remainingQuantity: { gt: 0 },
        ...(order.side === 'BUY' 
          ? { price: { lte: order.price } } // Buy order matches sell orders at or below buy price
          : { price: { gte: order.price } } // Sell order matches buy orders at or above sell price
        ),
      },
      orderBy: order.side === 'BUY' 
        ? { price: 'asc' } // For buy orders, match cheapest sells first
        : { price: 'desc' }, // For sell orders, match highest buys first
    });

    const matches: OrderMatchResult[] = [];
    let remainingQuantity = order.remainingQuantity;

    for (const matchingOrder of matchingOrders) {
      if (remainingQuantity <= 0) break;

      const tradeQuantity = Math.min(remainingQuantity, matchingOrder.remainingQuantity);
      const tradePrice = matchingOrder.price; // Price-time priority: use existing order's price

      // Create order fill record
      await this.prisma.orderFill.create({
        data: {
          orderId: order.id,
          counterpartyOrderId: matchingOrder.id,
          quantity: tradeQuantity,
          price: tradePrice,
        },
      });

      // Update order quantities
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          remainingQuantity: remainingQuantity - tradeQuantity,
          status: remainingQuantity - tradeQuantity <= 0 ? 'FILLED' : 'ACTIVE',
        },
      });

      await this.prisma.order.update({
        where: { id: matchingOrder.id },
        data: {
          remainingQuantity: matchingOrder.remainingQuantity - tradeQuantity,
          status: matchingOrder.remainingQuantity - tradeQuantity <= 0 ? 'FILLED' : 'ACTIVE',
        },
      });

      // Execute the trade
      await this.executeTrade({
        orderId: order.id,
        matchedOrderId: matchingOrder.id,
        price: tradePrice,
        quantity: tradeQuantity,
        buyerId: order.side === 'BUY' ? order.userId : matchingOrder.userId,
        sellerId: order.side === 'SELL' ? order.userId : matchingOrder.userId,
        itemInstanceId: order.itemInstanceId,
      });

      matches.push({
        orderId: order.id,
        matchedOrderId: matchingOrder.id,
        price: tradePrice,
        quantity: tradeQuantity,
        buyerId: order.side === 'BUY' ? order.userId : matchingOrder.userId,
        sellerId: order.side === 'SELL' ? order.userId : matchingOrder.userId,
        itemInstanceId: order.itemInstanceId,
      });

      remainingQuantity -= tradeQuantity;
    }

    return matches;
  }

  private async executeTrade(match: OrderMatchResult) {
    const { buyerId, sellerId, itemInstanceId, quantity, price } = match;

    // Transfer currency from buyer to seller
    const totalCost = price * quantity;

    await this.prisma.$transaction(async (tx) => {
      // Deduct gold from buyer
      await tx.wallet.update({
        where: {
          userId_currencyId: {
            userId: buyerId,
            currencyId: 'gold-currency-id', // Assuming we have a gold currency
          },
        },
        data: {
          balance: { decrement: totalCost },
        },
      });

      // Add gold to seller
      await tx.wallet.update({
        where: {
          userId_currencyId: {
            userId: sellerId,
            currencyId: 'gold-currency-id',
          },
        },
        data: {
          balance: { increment: totalCost },
        },
      });

      // Transfer item from escrow to buyer
      await this.escrowService.transferFromEscrow(match.orderId, buyerId, quantity);

      // Create transfer records
      await tx.transfer.create({
        data: {
          fromWalletId: `${buyerId}-gold`,
          toWalletId: `${sellerId}-gold`,
          currencyId: 'gold-currency-id',
          amount: totalCost,
          reason: 'MARKET_TRADE',
          refType: 'ORDER_FILL',
          refId: match.orderId,
        },
      });
    });

    this.logger.log(`Executed trade: ${quantity}x item ${itemInstanceId} at ${price} gold each`);
  }
}
