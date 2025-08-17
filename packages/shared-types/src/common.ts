import { z } from 'zod';

// Common types used across all schemas
export const IdSchema = z.string().cuid();
export const TimestampSchema = z.date();
export const StringTimestampSchema = z.string().datetime();

export const RaritySchema = z.enum(['common', 'rare', 'epic', 'legendary']);
export const SlotSchema = z.enum(['weapon', 'head', 'chest', 'legs', 'feet', 'hands', 'ring', 'trinket', 'consumable']);
export const BiomeSchema = z.enum(['forest', 'desert', 'mountains', 'swamp', 'plains', 'caves', 'ruins', 'city']);
export const ToneSchema = z.enum(['grim', 'whimsical', 'heroic', 'dark', 'lighthearted']);

export const StatsSchema = z.record(z.string(), z.number());
export const TagsSchema = z.array(z.string());

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    timestamp: StringTimestampSchema,
  });

// Health check response
export const HealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: StringTimestampSchema,
  version: z.string(),
  dependencies: z.record(z.string(), z.enum(['healthy', 'unhealthy'])).optional(),
});

export type Id = z.infer<typeof IdSchema>;
export type Rarity = z.infer<typeof RaritySchema>;
export type Slot = z.infer<typeof SlotSchema>;
export type Biome = z.infer<typeof BiomeSchema>;
export type Tone = z.infer<typeof ToneSchema>;
export type Stats = z.infer<typeof StatsSchema>;
export type Tags = z.infer<typeof TagsSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type Health = z.infer<typeof HealthSchema>;
