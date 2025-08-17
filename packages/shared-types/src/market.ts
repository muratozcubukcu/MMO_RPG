import { z } from 'zod';
import { IdSchema, StringTimestampSchema } from './common';

// Currency
export const CurrencySchema = z.object({
  id: IdSchema,
  code: z.string(),
  name: z.string(),
  symbol: z.string().optional(),
  decimals: z.number().int().min(0).default(0),
});

// Wallet
export const WalletSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  currencyId: IdSchema,
  balance: z.number().min(0),
  lockedBalance: z.number().min(0).default(0), // in escrow/orders
  updatedAt: StringTimestampSchema,
});

// Order types
export const OrderTypeSchema = z.enum(['LIMIT', 'MARKET', 'AUCTION']);
export const OrderSideSchema = z.enum(['BUY', 'SELL']);
export const OrderStatusSchema = z.enum(['PENDING', 'PARTIAL', 'FILLED', 'CANCELLED', 'EXPIRED']);

// Market order
export const OrderSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  type: OrderTypeSchema,
  side: OrderSideSchema,
  status: OrderStatusSchema,
  // Item details
  itemInstanceId: IdSchema.optional(), // for specific instance sales
  itemArchetypeSlug: z.string().optional(), // for archetype-based orders
  quantity: z.number().int().min(1),
  quantityFilled: z.number().int().min(0).default(0),
  // Pricing
  price: z.number().min(0), // per unit
  totalValue: z.number().min(0), // price * quantity
  currencyId: IdSchema,
  // Auction-specific
  auctionEndTime: StringTimestampSchema.optional(),
  reservePrice: z.number().min(0).optional(),
  // Metadata
  createdAt: StringTimestampSchema,
  updatedAt: StringTimestampSchema,
  expiresAt: StringTimestampSchema.optional(),
});

// Order fill/match
export const OrderFillSchema = z.object({
  id: IdSchema,
  buyOrderId: IdSchema,
  sellOrderId: IdSchema,
  quantity: z.number().int().min(1),
  price: z.number().min(0), // execution price
  totalValue: z.number().min(0),
  currencyId: IdSchema,
  fees: z.object({
    buyerFee: z.number().min(0),
    sellerFee: z.number().min(0),
    platformFee: z.number().min(0),
  }),
  createdAt: StringTimestampSchema,
});

// Escrow for item trades
export const EscrowSchema = z.object({
  id: IdSchema,
  buyerUserId: IdSchema,
  sellerUserId: IdSchema,
  itemInstanceId: IdSchema,
  quantity: z.number().int().min(1),
  price: z.number().min(0),
  currencyId: IdSchema,
  status: z.enum(['PENDING', 'FUNDED', 'RELEASED', 'DISPUTED', 'CANCELLED']),
  buyerWalletId: IdSchema,
  sellerWalletId: IdSchema,
  createdAt: StringTimestampSchema,
  updatedAt: StringTimestampSchema,
  expiresAt: StringTimestampSchema.optional(),
});

// Transfer record
export const TransferSchema = z.object({
  id: IdSchema,
  fromWalletId: IdSchema.optional(),
  toWalletId: IdSchema.optional(),
  currencyId: IdSchema,
  amount: z.number().min(0),
  reason: z.string(),
  referenceType: z.enum(['ORDER_FILL', 'ESCROW_RELEASE', 'REWARD', 'ADMIN', 'SYSTEM']),
  referenceId: IdSchema.optional(),
  createdAt: StringTimestampSchema,
});

// Market listing request
export const CreateOrderRequestSchema = z.object({
  type: OrderTypeSchema,
  side: OrderSideSchema,
  itemInstanceId: IdSchema.optional(),
  itemArchetypeSlug: z.string().optional(),
  quantity: z.number().int().min(1),
  price: z.number().min(0),
  currencyId: IdSchema,
  // Auction-specific
  duration: z.number().int().min(3600).max(604800).optional(), // 1 hour to 1 week
  reservePrice: z.number().min(0).optional(),
});

// Cancel order request
export const CancelOrderRequestSchema = z.object({
  orderId: IdSchema,
});

// Market book entry
export const MarketBookEntrySchema = z.object({
  price: z.number().min(0),
  quantity: z.number().int().min(1),
  orderCount: z.number().int().min(1),
});

// Market book
export const MarketBookSchema = z.object({
  itemArchetypeSlug: z.string(),
  currencyId: IdSchema,
  bids: z.array(MarketBookEntrySchema),
  asks: z.array(MarketBookEntrySchema),
  lastPrice: z.number().min(0).optional(),
  priceChange24h: z.number().optional(),
  volume24h: z.number().min(0).optional(),
  updatedAt: StringTimestampSchema,
});

// Market statistics
export const MarketStatsSchema = z.object({
  itemArchetypeSlug: z.string(),
  currencyId: IdSchema,
  stats24h: z.object({
    volume: z.number().min(0),
    trades: z.number().int().min(0),
    high: z.number().min(0).optional(),
    low: z.number().min(0).optional(),
    open: z.number().min(0).optional(),
    close: z.number().min(0).optional(),
    change: z.number().optional(),
    changePercent: z.number().optional(),
  }),
  stats7d: z.object({
    volume: z.number().min(0),
    trades: z.number().int().min(0),
    avgPrice: z.number().min(0).optional(),
  }).optional(),
  updatedAt: StringTimestampSchema,
});

// Market search/filter
export const MarketFilterSchema = z.object({
  itemArchetypeSlug: z.string().optional(),
  side: OrderSideSchema.optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  currencyId: IdSchema.optional(),
  sortBy: z.enum(['price', 'quantity', 'createdAt']).default('price'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type Currency = z.infer<typeof CurrencySchema>;
export type Wallet = z.infer<typeof WalletSchema>;
export type OrderType = z.infer<typeof OrderTypeSchema>;
export type OrderSide = z.infer<typeof OrderSideSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderFill = z.infer<typeof OrderFillSchema>;
export type Escrow = z.infer<typeof EscrowSchema>;
export type Transfer = z.infer<typeof TransferSchema>;
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
export type CancelOrderRequest = z.infer<typeof CancelOrderRequestSchema>;
export type MarketBookEntry = z.infer<typeof MarketBookEntrySchema>;
export type MarketBook = z.infer<typeof MarketBookSchema>;
export type MarketStats = z.infer<typeof MarketStatsSchema>;
export type MarketFilter = z.infer<typeof MarketFilterSchema>;
