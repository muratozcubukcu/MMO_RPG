import { z } from 'zod';

// Base ID types
export const IdSchema = z.string().min(1);
export const UUIDSchema = z.string().uuid();
export const EmailSchema = z.string().email();
export const TimestampSchema = z.date();

// Common enums
export const RaritySchema = z.enum(['common', 'rare', 'epic', 'legendary']);
export const ItemSlotSchema = z.enum(['weapon', 'head', 'chest', 'legs', 'feet', 'ring', 'trinket', 'consumable']);
export const BiomeSchema = z.enum(['forest', 'desert', 'mountain', 'swamp', 'cave', 'ruins', 'city', 'ocean']);
export const ToneSchema = z.enum(['grim', 'whimsical', 'heroic', 'mysterious', 'dark']);

// Status enums
export const WorldStatusSchema = z.enum(['generating', 'active', 'archived', 'error']);
export const OrderStatusSchema = z.enum(['pending', 'filled', 'cancelled', 'expired']);
export const OrderTypeSchema = z.enum(['limit', 'auction']);
export const OrderSideSchema = z.enum(['buy', 'sell']);

// Coordinate system
export const CoordinateSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int().default(0)
});

// Stats object
export const StatsSchema = z.record(z.string(), z.number());

// Generic response wrapper
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    timestamp: TimestampSchema.default(() => new Date())
  });

// Pagination
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  total: z.number().int().optional(),
  totalPages: z.number().int().optional()
});

export type Id = z.infer<typeof IdSchema>;
export type UUID = z.infer<typeof UUIDSchema>;
export type Email = z.infer<typeof EmailSchema>;
export type Timestamp = z.infer<typeof TimestampSchema>;
export type Rarity = z.infer<typeof RaritySchema>;
export type ItemSlot = z.infer<typeof ItemSlotSchema>;
export type Biome = z.infer<typeof BiomeSchema>;
export type Tone = z.infer<typeof ToneSchema>;
export type WorldStatus = z.infer<typeof WorldStatusSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type OrderType = z.infer<typeof OrderTypeSchema>;
export type OrderSide = z.infer<typeof OrderSideSchema>;
export type Coordinate = z.infer<typeof CoordinateSchema>;
export type Stats = z.infer<typeof StatsSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
};