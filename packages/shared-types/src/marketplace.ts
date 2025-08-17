import { z } from 'zod';
import { IdSchema, TimestampSchema, OrderStatusSchema, OrderTypeSchema, OrderSideSchema, PaginationSchema } from './common';

// Currency Schema
export const CurrencySchema = z.object({
  id: IdSchema,
  code: z.string().regex(/^[A-Z]{3,10}$/),
  name: z.string(),
  symbol: z.string().optional(),
  decimals: z.number().int().min(0).max(8).default(0),
  isActive: z.boolean().default(true),
  createdAt: TimestampSchema
});

// Wallet Schema
export const WalletSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  currencyId: IdSchema,
  balance: z.number().min(0).default(0),
  lockedBalance: z.number().min(0).default(0), // in escrow/pending orders
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

// Order Schema
export const OrderSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  itemArchetypeId: IdSchema.optional(), // for archetype trading
  itemInstanceId: IdSchema.optional(), // for specific instance trading
  type: OrderTypeSchema,
  side: OrderSideSchema,
  price: z.number().positive(),
  originalQuantity: z.number().int().min(1),
  remainingQuantity: z.number().int().min(0),
  filledQuantity: z.number().int().min(0).default(0),
  status: OrderStatusSchema,
  currencyId: IdSchema,
  expiresAt: TimestampSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  filledAt: TimestampSchema.optional(),
  cancelledAt: TimestampSchema.optional()
});

// Order Fill Schema
export const OrderFillSchema = z.object({
  id: IdSchema,
  buyOrderId: IdSchema,
  sellOrderId: IdSchema,
  quantity: z.number().int().min(1),
  price: z.number().positive(),
  buyerUserId: IdSchema,
  sellerUserId: IdSchema,
  itemArchetypeId: IdSchema.optional(),
  itemInstanceId: IdSchema.optional(),
  currencyId: IdSchema,
  totalAmount: z.number().positive(),
  feeAmount: z.number().min(0).default(0),
  createdAt: TimestampSchema
});

// Escrow Schema
export const EscrowSchema = z.object({
  id: IdSchema,
  buyerWalletId: IdSchema,
  sellerWalletId: IdSchema,
  itemInstanceId: IdSchema,
  orderId: IdSchema,
  amount: z.number().positive(),
  currencyId: IdSchema,
  status: z.enum(['pending', 'completed', 'cancelled', 'disputed']),
  createdAt: TimestampSchema,
  completedAt: TimestampSchema.optional(),
  cancelledAt: TimestampSchema.optional()
});

// Transfer Schema
export const TransferSchema = z.object({
  id: IdSchema,
  fromWalletId: IdSchema.optional(),
  toWalletId: IdSchema.optional(),
  currencyId: IdSchema,
  amount: z.number().positive(),
  feeAmount: z.number().min(0).default(0),
  reason: z.enum(['trade', 'escrow', 'fee', 'admin', 'reward', 'refund']),
  referenceType: z.string().optional(),
  referenceId: IdSchema.optional(),
  createdAt: TimestampSchema
});

// API Schemas
export const CreateOrderRequestSchema = z.object({
  itemArchetypeId: IdSchema.optional(),
  itemInstanceId: IdSchema.optional(),
  type: OrderTypeSchema,
  side: OrderSideSchema,
  price: z.number().positive(),
  quantity: z.number().int().min(1),
  currencyCode: z.string(),
  expiresIn: z.number().int().min(60).max(86400 * 30).optional() // seconds, max 30 days
}).refine(data => data.itemArchetypeId || data.itemInstanceId, {
  message: "Either itemArchetypeId or itemInstanceId must be provided"
});

export const CancelOrderRequestSchema = z.object({
  orderId: IdSchema
});

export const OrderBookEntrySchema = z.object({
  price: z.number().positive(),
  quantity: z.number().int().min(1),
  orderCount: z.number().int().min(1)
});

export const OrderBookResponseSchema = z.object({
  itemArchetypeId: IdSchema,
  bids: z.array(OrderBookEntrySchema).max(50),
  asks: z.array(OrderBookEntrySchema).max(50),
  lastPrice: z.number().positive().optional(),
  priceChange24h: z.number().optional(),
  volume24h: z.number().min(0).optional(),
  timestamp: TimestampSchema
});

export const MarketStatsSchema = z.object({
  itemArchetypeId: IdSchema,
  currentPrice: z.number().positive().optional(),
  highPrice24h: z.number().positive().optional(),
  lowPrice24h: z.number().positive().optional(),
  volume24h: z.number().min(0),
  trades24h: z.number().int().min(0),
  priceChange24h: z.number(),
  priceChangePercent24h: z.number(),
  timestamp: TimestampSchema
});

export const UserOrdersResponseSchema = z.object({
  orders: z.array(OrderSchema.extend({
    itemArchetype: z.object({
      slug: z.string(),
      name: z.string(),
      rarity: z.string()
    }).optional(),
    itemInstance: z.object({
      id: IdSchema,
      archetypeSlug: z.string(),
      rollData: z.record(z.string(), z.any())
    }).optional(),
    currency: CurrencySchema
  })),
  pagination: PaginationSchema
});

export const TradeHistoryResponseSchema = z.object({
  trades: z.array(OrderFillSchema.extend({
    itemArchetype: z.object({
      slug: z.string(),
      name: z.string(),
      rarity: z.string()
    }).optional(),
    currency: CurrencySchema
  })),
  pagination: PaginationSchema
});

export const WalletResponseSchema = z.object({
  wallets: z.array(WalletSchema.extend({
    currency: CurrencySchema
  }))
});

// Market Fee Configuration
export const MarketFeeConfigSchema = z.object({
  listingFeePercent: z.number().min(0).max(10).default(0.5),
  tradeFeePercent: z.number().min(0).max(10).default(2.5),
  minListingFee: z.number().min(0).default(1),
  maxListingFee: z.number().min(0).default(1000),
  auctionFeePercent: z.number().min(0).max(10).default(5)
});

// Types
export type Currency = z.infer<typeof CurrencySchema>;
export type Wallet = z.infer<typeof WalletSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderFill = z.infer<typeof OrderFillSchema>;
export type Escrow = z.infer<typeof EscrowSchema>;
export type Transfer = z.infer<typeof TransferSchema>;

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
export type CancelOrderRequest = z.infer<typeof CancelOrderRequestSchema>;
export type OrderBookEntry = z.infer<typeof OrderBookEntrySchema>;
export type OrderBookResponse = z.infer<typeof OrderBookResponseSchema>;
export type MarketStats = z.infer<typeof MarketStatsSchema>;
export type UserOrdersResponse = z.infer<typeof UserOrdersResponseSchema>;
export type TradeHistoryResponse = z.infer<typeof TradeHistoryResponseSchema>;
export type WalletResponse = z.infer<typeof WalletResponseSchema>;
export type MarketFeeConfig = z.infer<typeof MarketFeeConfigSchema>;