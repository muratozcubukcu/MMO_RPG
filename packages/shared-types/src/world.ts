import { z } from 'zod';
import { IdSchema, TimestampSchema, RaritySchema, ItemSlotSchema, BiomeSchema, ToneSchema, WorldStatusSchema, StatsSchema, CoordinateSchema } from './common';

// World Blueprint Schema (AI generation output)
export const ItemArchetypeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  rarity: RaritySchema,
  slot: ItemSlotSchema,
  stats: StatsSchema,
  tags: z.array(z.string()).default([]),
  value: z.number().int().min(1).default(1),
  stackable: z.boolean().default(false),
  maxStack: z.number().int().min(1).default(1)
});

export const DropSchema = z.object({
  archetype_slug: z.string(),
  weight: z.number().positive(),
  minQty: z.number().int().min(1).default(1),
  maxQty: z.number().int().min(1).default(1)
});

export const LocationSchema = z.object({
  key: z.string().regex(/^[a-z0-9-_]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(1000),
  biome: BiomeSchema,
  coordinate: CoordinateSchema,
  connections: z.array(z.string()).min(1),
  spawns: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  safeZone: z.boolean().default(false)
});

export const MobSchema = z.object({
  key: z.string().regex(/^[a-z0-9-_]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  level: z.number().int().min(1).max(100),
  stats: StatsSchema,
  drops: z.array(DropSchema).default([]),
  abilities: z.array(z.string()).default([]),
  faction: z.string().optional(),
  aggressive: z.boolean().default(true),
  respawnTime: z.number().int().min(60).default(300) // seconds
});

export const QuestStepSchema = z.object({
  kind: z.enum(['collect', 'defeat', 'visit', 'talk', 'use', 'craft']),
  target: z.string(),
  count: z.number().int().min(1).default(1),
  description: z.string().max(200)
});

export const QuestRewardSchema = z.object({
  type: z.enum(['xp', 'gold', 'item', 'unlock']),
  value: z.union([z.string(), z.number()]),
  quantity: z.number().int().min(1).default(1)
});

export const QuestSchema = z.object({
  key: z.string().regex(/^[a-z0-9-_]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(1000),
  summary: z.string().max(200),
  steps: z.array(QuestStepSchema).min(1),
  rewards: z.array(QuestRewardSchema).default([]),
  prerequisites: z.array(z.string()).default([]),
  level: z.number().int().min(1).max(100).default(1),
  faction: z.string().optional()
});

export const FactionSchema = z.object({
  key: z.string().regex(/^[a-z0-9-_]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  alignment: z.enum(['good', 'neutral', 'evil']),
  relations: z.record(z.string(), z.number().min(-100).max(100)).default({})
});

export const LootTableSchema = z.object({
  id: z.string(),
  name: z.string(),
  drops: z.array(DropSchema),
  conditions: z.record(z.string(), z.any()).default({})
});

export const WorldSettingSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(2000),
  tone: ToneSchema,
  theme: z.string().max(100),
  timeOfDay: z.enum(['dawn', 'day', 'dusk', 'night']).default('day'),
  weather: z.enum(['clear', 'cloudy', 'rain', 'storm', 'snow']).default('clear'),
  dangerLevel: z.number().min(1).max(10).default(5)
});

// Main World Blueprint Schema
export const WorldBlueprintSchema = z.object({
  setting: WorldSettingSchema,
  seed: z.string(),
  version: z.string().default('1.0.0'),
  item_archetypes: z.array(ItemArchetypeSchema).min(20),
  locations: z.array(LocationSchema).min(30),
  mobs: z.array(MobSchema).min(15),
  quests: z.array(QuestSchema).min(5),
  factions: z.array(FactionSchema).default([]),
  loot_tables: z.array(LootTableSchema).default([])
});

// World database schemas
export const WorldSchema = z.object({
  id: IdSchema,
  ownerUserId: IdSchema,
  title: z.string().min(1).max(100),
  prompt: z.string().max(2000),
  seed: z.string(),
  modelVersion: z.string(),
  compilerVersion: z.string(),
  status: WorldStatusSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  lastPlayedAt: TimestampSchema.optional(),
  playerCount: z.number().int().min(0).default(0),
  isPublic: z.boolean().default(false),
  maxPlayers: z.number().int().min(1).default(10)
});

export const WorldVersionSchema = z.object({
  id: IdSchema,
  worldId: IdSchema,
  version: z.number().int().min(1),
  blueprintHash: z.string(),
  compiledHash: z.string(),
  blueprintUrl: z.string().url().optional(),
  compiledUrl: z.string().url().optional(),
  createdAt: TimestampSchema,
  isActive: z.boolean().default(false)
});

// World generation API schemas
export const CreateWorldRequestSchema = z.object({
  prompt: z.string().min(10).max(2000),
  title: z.string().min(1).max(100).optional(),
  isPublic: z.boolean().default(false),
  maxPlayers: z.number().int().min(1).max(20).default(10)
});

export const WorldGenerationJobSchema = z.object({
  id: IdSchema,
  worldId: IdSchema,
  status: z.enum(['queued', 'generating', 'validating', 'compiling', 'completed', 'failed']),
  progress: z.number().min(0).max(100).default(0),
  error: z.string().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  completedAt: TimestampSchema.optional()
});

// Types
export type ItemArchetype = z.infer<typeof ItemArchetypeSchema>;
export type Drop = z.infer<typeof DropSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Mob = z.infer<typeof MobSchema>;
export type QuestStep = z.infer<typeof QuestStepSchema>;
export type QuestReward = z.infer<typeof QuestRewardSchema>;
export type Quest = z.infer<typeof QuestSchema>;
export type Faction = z.infer<typeof FactionSchema>;
export type LootTable = z.infer<typeof LootTableSchema>;
export type WorldSetting = z.infer<typeof WorldSettingSchema>;
export type WorldBlueprint = z.infer<typeof WorldBlueprintSchema>;
export type World = z.infer<typeof WorldSchema>;
export type WorldVersion = z.infer<typeof WorldVersionSchema>;
export type CreateWorldRequest = z.infer<typeof CreateWorldRequestSchema>;
export type WorldGenerationJob = z.infer<typeof WorldGenerationJobSchema>;