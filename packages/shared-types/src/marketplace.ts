import { z } from 'zod';

// Currency schemas
export const CurrencySchema = z.object({
  id: z.string(),
  code: z.string().regex(/^[A-Z]{3,8}$/), // e.g., GOLD, GEMS, SILVER
  name: z.string().min(1).max(50),
  symbol: z.string().max(5),
  decimals: z.number().int().min(0).max(8).default(0)
});

// Wallet schemas
export const WalletSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  currencyId: z.string(),
  balance: z.number().int().min(0),
  lockedBalance: z.number().int().min(0).default(0), // funds in escrow
  lastUpdated: z.number().int().positive()
});

// Order schemas
export const OrderTypeSchema = z.enum(['LIMIT', 'MARKET', 'AUCTION']);
export const OrderSideSchema = z.enum(['BUY', 'SELL']);
export const OrderStatusSchema = z.enum(['PENDING', 'PARTIAL', 'FILLED', 'CANCELLED', 'EXPIRED']);

export const OrderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  type: OrderTypeSchema,
  side: OrderSideSchema,
  status: OrderStatusSchema,
  
  // Item details
  itemArchetypeId: z.string().optional(), // for archetype trading
  itemInstanceId: z.string().optional(),  // for specific instance trading
  
  // Pricing
  price: z.number().int().min(1), // price per unit in smallest currency unit
  quantity: z.number().int().min(1),
  filledQuantity: z.number().int().min(0).default(0),
  
  // Currency
  currencyId: z.string(),
  
  // Timing
  createdAt: z.number().int().positive(),
  expiresAt: z.number().int().positive().optional(), // for auctions/time-limited orders
  lastUpdated: z.number().int().positive(),
  
  // Metadata
  metadata: z.record(z.any()).optional() // additional order data
}).refine(data => data.itemArchetypeId || data.itemInstanceId, {
  message: "Either itemArchetypeId or itemInstanceId must be provided"
});

// Order fill/match schemas
export const OrderFillSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  counterpartyOrderId: z.string().uuid(),
  quantity: z.number().int().min(1),
  price: z.number().int().min(1),
  timestamp: z.number().int().positive(),
  fees: z.object({
    makerFee: z.number().int().min(0),
    takerFee: z.number().int().min(0),
    totalFee: z.number().int().min(0)
  })
});

// Escrow schemas
export const EscrowStatusSchema = z.enum(['CREATED', 'FUNDED', 'RELEASED', 'DISPUTED', 'CANCELLED']);

export const EscrowSchema = z.object({
  id: z.string().uuid(),
  buyerUserId: z.string(),
  sellerUserId: z.string(),
  itemInstanceId: z.string(),
  currencyId: z.string(),
  amount: z.number().int().min(1),
  status: EscrowStatusSchema,
  createdAt: z.number().int().positive(),
  expiresAt: z.number().int().positive().optional(),
  releasedAt: z.number().int().positive().optional(),
  metadata: z.record(z.any()).optional()
});

// Transfer schemas
export const TransferReasonSchema = z.enum([
  'TRADE', 'ESCROW_FUND', 'ESCROW_RELEASE', 'FEE', 'REWARD',
  'QUEST_REWARD', 'ADMIN_ADJUSTMENT', 'REFUND', 'BURN'
]);

export const TransferSchema = z.object({
  id: z.string().uuid(),
  fromWalletId: z.string().uuid().optional(), // null for minting
  toWalletId: z.string().uuid().optional(),   // null for burning
  currencyId: z.string(),
  amount: z.number().int().min(1),
  reason: TransferReasonSchema,
  referenceType: z.string().optional(), // 'order', 'escrow', 'quest', etc.
  referenceId: z.string().optional(),
  timestamp: z.number().int().positive(),
  metadata: z.record(z.any()).optional()
}).refine(data => data.fromWalletId || data.toWalletId, {
  message: "At least one of fromWalletId or toWalletId must be provided"
});

// Market data schemas
export const PricePointSchema = z.object({
  price: z.number().int().min(1),
  quantity: z.number().int().min(1),
  orderCount: z.number().int().min(1)
});

export const OrderBookSchema = z.object({
  itemArchetypeId: z.string().optional(),
  itemInstanceId: z.string().optional(),
  currencyId: z.string(),
  bids: z.array(PricePointSchema).max(100), // buy orders, highest price first
  asks: z.array(PricePointSchema).max(100), // sell orders, lowest price first
  lastUpdate: z.number().int().positive()
}).refine(data => data.itemArchetypeId || data.itemInstanceId, {
  message: "Either itemArchetypeId or itemInstanceId must be provided"
});

export const MarketStatsSchema = z.object({
  itemArchetypeId: z.string().optional(),
  itemInstanceId: z.string().optional(),
  currencyId: z.string(),
  lastPrice: z.number().int().min(0).optional(),
  volume24h: z.number().int().min(0),
  high24h: z.number().int().min(0).optional(),
  low24h: z.number().int().min(0).optional(),
  change24h: z.number().optional(), // percentage change
  totalTrades: z.number().int().min(0),
  lastUpdate: z.number().int().positive()
}).refine(data => data.itemArchetypeId || data.itemInstanceId, {
  message: "Either itemArchetypeId or itemInstanceId must be provided"
});

// Listing schemas (simplified marketplace view)
export const ListingSchema = z.object({
  id: z.string(),
  sellerId: z.string(),
  sellerName: z.string(),
  itemArchetypeId: z.string().optional(),
  itemInstanceId: z.string().optional(),
  itemName: z.string(),
  itemRarity: z.string(),
  itemLevel: z.number().int().min(1).optional(),
  price: z.number().int().min(1),
  currencyCode: z.string(),
  quantity: z.number().int().min(1),
  availableQuantity: z.number().int().min(0),
  createdAt: z.number().int().positive(),
  expiresAt: z.number().int().positive().optional(),
  featured: z.boolean().default(false)
});

// Fee configuration schema
export const FeeConfigSchema = z.object({
  listingFee: z.number().min(0).max(1), // percentage
  tradingFee: z.number().min(0).max(1), // percentage
  minListingFee: z.number().int().min(0), // minimum absolute fee
  maxListingFee: z.number().int().min(0).optional(), // maximum absolute fee
  burnRate: z.number().min(0).max(1).default(0.5) // percentage of fees to burn
});

// Trade history schema
export const TradeHistorySchema = z.object({
  id: z.string().uuid(),
  buyerId: z.string(),
  sellerId: z.string(),
  itemArchetypeId: z.string().optional(),
  itemInstanceId: z.string().optional(),
  itemName: z.string(),
  quantity: z.number().int().min(1),
  price: z.number().int().min(1),
  totalValue: z.number().int().min(1),
  currencyCode: z.string(),
  timestamp: z.number().int().positive(),
  fees: z.object({
    buyerFee: z.number().int().min(0),
    sellerFee: z.number().int().min(0),
    totalFee: z.number().int().min(0)
  })
});

// Market search/filter schemas
export const MarketSearchSchema = z.object({
  query: z.string().max(100).optional(),
  itemArchetypeIds: z.array(z.string()).optional(),
  rarities: z.array(z.string()).optional(),
  slots: z.array(z.string()).optional(),
  minPrice: z.number().int().min(0).optional(),
  maxPrice: z.number().int().min(0).optional(),
  currencyId: z.string().optional(),
  minLevel: z.number().int().min(1).optional(),
  maxLevel: z.number().int().min(1).optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'newest', 'oldest', 'name']).default('price_asc'),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

// Export types
export type Currency = z.infer<typeof CurrencySchema>;
export type Wallet = z.infer<typeof WalletSchema>;
export type OrderType = z.infer<typeof OrderTypeSchema>;
export type OrderSide = z.infer<typeof OrderSideSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderFill = z.infer<typeof OrderFillSchema>;
export type EscrowStatus = z.infer<typeof EscrowStatusSchema>;
export type Escrow = z.infer<typeof EscrowSchema>;
export type TransferReason = z.infer<typeof TransferReasonSchema>;
export type Transfer = z.infer<typeof TransferSchema>;
export type PricePoint = z.infer<typeof PricePointSchema>;
export type OrderBook = z.infer<typeof OrderBookSchema>;
export type MarketStats = z.infer<typeof MarketStatsSchema>;
export type Listing = z.infer<typeof ListingSchema>;
export type FeeConfig = z.infer<typeof FeeConfigSchema>;
export type TradeHistory = z.infer<typeof TradeHistorySchema>;
export type MarketSearch = z.infer<typeof MarketSearchSchema>;