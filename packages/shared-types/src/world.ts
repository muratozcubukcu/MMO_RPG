import { z } from 'zod';

// Basic world schemas
export const WorldSeedSchema = z.string().min(1).max(100);

export const BiomeSchema = z.enum([
  'forest', 'desert', 'mountain', 'swamp', 'plains', 'tundra', 
  'cave', 'ruins', 'city', 'dungeon', 'ocean', 'sky'
]);

export const ToneSchema = z.enum(['grim', 'whimsical', 'heroic', 'mysterious', 'epic']);

// Item schemas
export const RaritySchema = z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary', 'artifact']);

export const ItemSlotSchema = z.enum([
  'weapon', 'offhand', 'head', 'chest', 'legs', 'feet', 
  'ring', 'amulet', 'trinket', 'consumable', 'tool', 'material'
]);

export const ItemArchetypeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  rarity: RaritySchema,
  slot: ItemSlotSchema,
  stats: z.record(z.string(), z.number()),
  tags: z.array(z.string()).max(20),
  requirements: z.object({
    level: z.number().int().min(1).optional(),
    stats: z.record(z.string(), z.number()).optional()
  }).optional(),
  value: z.number().int().min(0)
});

// Location schemas
export const LocationSchema = z.object({
  key: z.string().regex(/^[a-z0-9-_]+$/),
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(1000),
  biome: BiomeSchema,
  connections: z.array(z.string()).min(1).max(8),
  spawns: z.array(z.object({
    mobKey: z.string(),
    weight: z.number().positive(),
    maxCount: z.number().int().min(1).max(10)
  })).optional(),
  items: z.array(z.object({
    archetypeSlug: z.string(),
    weight: z.number().positive(),
    respawnTime: z.number().int().min(0).optional()
  })).optional(),
  events: z.array(z.object({
    key: z.string(),
    trigger: z.enum(['enter', 'search', 'interact']),
    weight: z.number().positive()
  })).optional()
});

// Mob schemas
export const MobStatsSchema = z.object({
  level: z.number().int().min(1).max(100),
  health: z.number().int().min(1),
  attack: z.number().int().min(0),
  defense: z.number().int().min(0),
  speed: z.number().int().min(1),
  experience: z.number().int().min(0)
});

export const MobSchema = z.object({
  key: z.string().regex(/^[a-z0-9-_]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  level: z.number().int().min(1).max(100),
  stats: MobStatsSchema,
  drops: z.array(z.object({
    archetypeSlug: z.string(),
    weight: z.number().positive(),
    quantity: z.object({
      min: z.number().int().min(0),
      max: z.number().int().min(0)
    }).optional()
  })),
  abilities: z.array(z.object({
    key: z.string(),
    name: z.string(),
    cooldown: z.number().int().min(0),
    damage: z.number().int().min(0).optional(),
    effect: z.string().optional()
  })).optional(),
  behavior: z.enum(['passive', 'aggressive', 'defensive', 'territorial']),
  faction: z.string().optional()
});

// Quest schemas
export const QuestStepSchema = z.object({
  key: z.string(),
  kind: z.enum(['collect', 'defeat', 'visit', 'talk', 'use', 'craft']),
  target: z.string(),
  count: z.number().int().min(1),
  description: z.string().max(200)
});

export const QuestRewardSchema = z.object({
  type: z.enum(['experience', 'item', 'currency', 'unlock']),
  value: z.union([z.string(), z.number()]),
  quantity: z.number().int().min(1).optional()
});

export const QuestSchema = z.object({
  key: z.string().regex(/^[a-z0-9-_]+$/),
  name: z.string().min(1).max(100),
  summary: z.string().min(10).max(500),
  description: z.string().max(2000),
  level: z.number().int().min(1).max(100),
  prerequisites: z.array(z.string()).optional(),
  steps: z.array(QuestStepSchema).min(1).max(20),
  rewards: z.array(QuestRewardSchema),
  timeLimit: z.number().int().min(0).optional(),
  repeatable: z.boolean().default(false)
});

// Main world blueprint schema
export const WorldBlueprint = z.object({
  setting: z.object({
    title: z.string().min(1).max(100),
    description: z.string().min(10).max(2000),
    tone: ToneSchema,
    theme: z.string().max(200),
    primaryFactions: z.array(z.string()).min(1).max(5)
  }),
  seed: WorldSeedSchema,
  modelVersion: z.string(),
  itemArchetypes: z.array(ItemArchetypeSchema).min(20).max(200),
  locations: z.array(LocationSchema).min(30).max(500),
  mobs: z.array(MobSchema).min(15).max(200),
  quests: z.array(QuestSchema).min(5).max(100),
  lootTables: z.record(z.string(), z.array(z.object({
    archetypeSlug: z.string(),
    weight: z.number().positive(),
    levelRange: z.object({
      min: z.number().int().min(1),
      max: z.number().int().min(1)
    }).optional()
  }))),
  factions: z.record(z.string(), z.object({
    name: z.string(),
    description: z.string(),
    disposition: z.enum(['friendly', 'neutral', 'hostile']),
    relations: z.record(z.string(), z.number().min(-100).max(100)).optional()
  })).optional()
});

// Compiled world schema (with derived data)
export const CompiledWorldSchema = WorldBlueprint.extend({
  compiled: z.object({
    locationGraph: z.record(z.string(), z.array(z.string())),
    levelBands: z.record(z.string(), z.array(z.string())),
    spawnTables: z.record(z.string(), z.record(z.string(), z.number())),
    questDependencies: z.record(z.string(), z.array(z.string())),
    prngSeeds: z.record(z.string(), z.string())
  }),
  validation: z.object({
    errors: z.array(z.string()),
    warnings: z.array(z.string()),
    stats: z.object({
      totalLocations: z.number(),
      totalMobs: z.number(),
      totalQuests: z.number(),
      totalItems: z.number(),
      avgConnections: z.number()
    })
  })
});

// Export types
export type WorldSeed = z.infer<typeof WorldSeedSchema>;
export type Biome = z.infer<typeof BiomeSchema>;
export type Tone = z.infer<typeof ToneSchema>;
export type Rarity = z.infer<typeof RaritySchema>;
export type ItemSlot = z.infer<typeof ItemSlotSchema>;
export type ItemArchetype = z.infer<typeof ItemArchetypeSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type MobStats = z.infer<typeof MobStatsSchema>;
export type Mob = z.infer<typeof MobSchema>;
export type QuestStep = z.infer<typeof QuestStepSchema>;
export type QuestReward = z.infer<typeof QuestRewardSchema>;
export type Quest = z.infer<typeof QuestSchema>;
export type WorldBlueprint = z.infer<typeof WorldBlueprint>;
export type CompiledWorld = z.infer<typeof CompiledWorldSchema>;