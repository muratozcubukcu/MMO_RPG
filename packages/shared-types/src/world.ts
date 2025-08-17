import { z } from 'zod';
import { IdSchema, StringTimestampSchema, BiomeSchema, ToneSchema, StatsSchema, TagsSchema, RaritySchema, SlotSchema } from './common';

// World creation
export const WorldPromptInputSchema = z.object({
  prompt: z.string().min(10).max(2000),
  title: z.string().min(1).max(100).optional(),
  tone: ToneSchema.optional(),
});

// World status
export const WorldStatusSchema = z.enum(['generating', 'compiling', 'ready', 'error']);

// Location connection
export const LocationConnectionSchema = z.object({
  direction: z.enum(['north', 'south', 'east', 'west', 'up', 'down']),
  targetKey: z.string(),
  description: z.string().optional(),
});

// Location
export const LocationSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  biome: BiomeSchema,
  connections: z.array(LocationConnectionSchema),
  objects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    tags: TagsSchema,
  })).optional(),
  npcs: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    disposition: z.enum(['friendly', 'neutral', 'hostile']),
  })).optional(),
});

// Mob/Enemy
export const MobSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  level: z.number().int().min(1).max(100),
  stats: StatsSchema,
  drops: z.array(z.object({
    archetypeSlug: z.string(),
    weight: z.number().positive(),
    minQuantity: z.number().int().min(1).default(1),
    maxQuantity: z.number().int().min(1).default(1),
  })),
  abilities: z.array(z.string()).optional(),
});

// Quest step
export const QuestStepSchema = z.object({
  kind: z.enum(['collect', 'defeat', 'visit', 'talk', 'craft', 'use']),
  target: z.string(),
  count: z.number().int().min(1).default(1),
  description: z.string(),
});

// Quest
export const QuestSchema = z.object({
  key: z.string(),
  name: z.string(),
  summary: z.string(),
  description: z.string(),
  steps: z.array(QuestStepSchema),
  rewards: z.object({
    experience: z.number().int().min(0).default(0),
    gold: z.number().int().min(0).default(0),
    items: z.array(z.object({
      archetypeSlug: z.string(),
      quantity: z.number().int().min(1).default(1),
    })).optional(),
  }),
  prerequisites: z.array(z.string()).optional(), // quest keys
  level: z.number().int().min(1).default(1),
});

// Item archetype (global template)
export const ItemArchetypeSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  rarity: RaritySchema,
  slot: SlotSchema,
  stats: StatsSchema,
  tags: TagsSchema,
  value: z.number().int().min(0).default(0), // base gold value
  stackable: z.boolean().default(false),
  maxStack: z.number().int().min(1).default(1),
  levelRequirement: z.number().int().min(1).optional(), // minimum level to use
  classRestrictions: z.array(z.string()).optional(), // class names that can use this item
  usable: z.object({
    charges: z.number().int().min(1).optional(), // number of uses before consumed
    cooldown: z.number().min(0).optional(), // cooldown in seconds between uses
  }).optional(), // consumable/tool usage properties
});

// Loot table
export const LootTableSchema = z.object({
  key: z.string(),
  name: z.string(),
  entries: z.array(z.object({
    archetypeSlug: z.string(),
    weight: z.number().positive(),
    minQuantity: z.number().int().min(1).default(1),
    maxQuantity: z.number().int().min(1).default(1),
    conditions: z.array(z.string()).optional(), // condition keys
  })),
});

// World blueprint (LLM output)
export const WorldBlueprintSchema = z.object({
  setting: z.object({
    title: z.string(),
    description: z.string(),
    tone: ToneSchema,
    themes: z.array(z.string()).optional(),
  }),
  seed: z.string(),
  factions: z.array(z.object({
    key: z.string(),
    name: z.string(),
    description: z.string(),
    disposition: z.enum(['friendly', 'neutral', 'hostile']),
  })).optional(),
  locations: z.array(LocationSchema).min(30),
  mobs: z.array(MobSchema).min(20),
  quests: z.array(QuestSchema).min(10),
  itemArchetypes: z.array(ItemArchetypeSchema).min(20),
  lootTables: z.array(LootTableSchema).min(5),
});

// Compiled world (after processing)
export const CompiledWorldSchema = z.object({
  id: IdSchema,
  blueprint: WorldBlueprintSchema,
  metadata: z.object({
    version: z.number().int(),
    compilerVersion: z.string(),
    modelVersion: z.string(),
    promptHash: z.string(),
    compiledAt: StringTimestampSchema,
  }),
  // Computed data
  locationGraph: z.record(z.string(), z.array(z.string())), // adjacency list
  spawnTables: z.record(z.string(), z.array(z.object({
    mobKey: z.string(),
    weight: z.number(),
    level: z.number(),
  }))),
  levelCurves: z.object({
    experience: z.array(z.number()), // XP required for each level
    difficulty: z.array(z.number()), // difficulty multiplier by level
  }),
  seeds: z.object({
    combat: z.string(),
    loot: z.string(),
    spawns: z.string(),
    skills: z.string(),
  }),
});

// World entity (database)
export const WorldSchema = z.object({
  id: IdSchema,
  ownerId: IdSchema,
  title: z.string(),
  description: z.string().optional(),
  seed: z.string(),
  status: WorldStatusSchema,
  modelVersion: z.string(),
  createdAt: StringTimestampSchema,
  updatedAt: StringTimestampSchema,
  compiledWorldUrl: z.string().optional(), // S3/MinIO URL
  // World modifiers for cross-world items
  modifiers: z.object({
    offworldItemCap: RaritySchema.optional(),
    offworldScaling: z.number().min(0).max(1).optional(),
    entryRequirements: z.object({
      minLevel: z.number().int().min(1).optional(),
      requiredQuests: z.array(z.string()).optional(),
    }).optional(),
  }).optional(),
});

// World generation job
export const WorldGenJobSchema = z.object({
  id: IdSchema,
  worldId: IdSchema,
  userId: IdSchema,
  prompt: z.string(),
  status: z.enum(['queued', 'generating', 'validating', 'compiling', 'completed', 'failed']),
  progress: z.number().min(0).max(100).default(0),
  error: z.string().optional(),
  createdAt: StringTimestampSchema,
  updatedAt: StringTimestampSchema,
});

export type WorldPromptInput = z.infer<typeof WorldPromptInputSchema>;
export type WorldStatus = z.infer<typeof WorldStatusSchema>;
export type LocationConnection = z.infer<typeof LocationConnectionSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Mob = z.infer<typeof MobSchema>;
export type QuestStep = z.infer<typeof QuestStepSchema>;
export type Quest = z.infer<typeof QuestSchema>;
export type ItemArchetype = z.infer<typeof ItemArchetypeSchema>;
export type LootTable = z.infer<typeof LootTableSchema>;
export type WorldBlueprint = z.infer<typeof WorldBlueprintSchema>;
export type CompiledWorld = z.infer<typeof CompiledWorldSchema>;
export type World = z.infer<typeof WorldSchema>;
export type WorldGenJob = z.infer<typeof WorldGenJobSchema>;
