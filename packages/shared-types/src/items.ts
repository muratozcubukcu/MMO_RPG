import { z } from 'zod';
import { IdSchema, StringTimestampSchema, RaritySchema, SlotSchema, StatsSchema, TagsSchema } from './common';

// Item instance (actual item in game)
export const ItemInstanceSchema = z.object({
  id: IdSchema,
  archetypeSlug: z.string(),
  mintWorldId: IdSchema,
  rollData: z.object({
    stats: StatsSchema.optional(), // rolled stats (affixes)
    durability: z.object({
      current: z.number().int().min(0),
      max: z.number().int().min(1),
    }).optional(),
    enchantments: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      stats: StatsSchema,
    })).optional(),
    quality: z.number().min(0).max(1).optional(), // 0-1 quality multiplier
  }).optional(),
  boundToUserId: IdSchema.optional(), // bind-on-equip/pickup
  createdAt: StringTimestampSchema,
  metadata: z.object({
    source: z.string().optional(), // "mob:orc-warrior", "craft:recipe-123"
    crafter: IdSchema.optional(),
    generation: z.number().int().min(1).default(1), // for tracking item generations
  }).optional(),
});

// Inventory
export const InventorySchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  capacity: z.number().int().min(1).default(100),
  items: z.array(z.object({
    instanceId: IdSchema,
    quantity: z.number().int().min(1),
    equipped: z.boolean().default(false),
    position: z.object({
      slot: SlotSchema.optional(),
      x: z.number().int().min(0).optional(),
      y: z.number().int().min(0).optional(),
    }).optional(),
  })),
});

// Equipment loadout
export const EquipmentSchema = z.object({
  userId: IdSchema,
  worldId: IdSchema,
  slots: z.record(SlotSchema, z.object({
    instanceId: IdSchema,
    equippedAt: StringTimestampSchema,
  })).optional(),
  totalStats: StatsSchema.optional(), // computed from all equipped items
});

// Item use request
export const UseItemRequestSchema = z.object({
  instanceId: IdSchema,
  target: z.string().optional(),
  worldId: IdSchema,
});

// Item equip request
export const EquipItemRequestSchema = z.object({
  instanceId: IdSchema,
  slot: SlotSchema,
  worldId: IdSchema,
});

// Item transfer request
export const TransferItemRequestSchema = z.object({
  instanceId: IdSchema,
  fromUserId: IdSchema,
  toUserId: IdSchema,
  quantity: z.number().int().min(1),
  reason: z.string().optional(),
});

// Crafting recipe
export const CraftingRecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  requirements: z.object({
    level: z.number().int().min(1).optional(),
    skill: z.string().optional(),
    skillLevel: z.number().int().min(1).optional(),
    tools: z.array(z.string()).optional(), // archetype slugs
    location: z.string().optional(), // location key or type
  }).optional(),
  ingredients: z.array(z.object({
    archetypeSlug: z.string(),
    quantity: z.number().int().min(1),
    consumed: z.boolean().default(true),
  })),
  outputs: z.array(z.object({
    archetypeSlug: z.string(),
    quantity: z.number().int().min(1),
    chance: z.number().min(0).max(1).default(1),
  })),
  craftingTime: z.number().int().min(1).default(1), // in seconds
  category: z.string().optional(),
});

// Item archetype with extended data
export const ItemArchetypeExtendedSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  rarity: RaritySchema,
  slot: SlotSchema,
  stats: StatsSchema,
  tags: TagsSchema,
  value: z.number().int().min(0).default(0),
  stackable: z.boolean().default(false),
  maxStack: z.number().int().min(1).default(1),
  // Extended properties
  levelRequirement: z.number().int().min(1).optional(),
  classRestrictions: z.array(z.string()).optional(),
  durability: z.object({
    base: z.number().int().min(1),
    variance: z.number().min(0).max(0.5).default(0.1),
  }).optional(),
  usable: z.object({
    consumable: z.boolean().default(false),
    charges: z.number().int().min(1).optional(),
    cooldown: z.number().int().min(0).default(0), // seconds
    effects: z.array(z.object({
      type: z.string(),
      value: z.number(),
      duration: z.number().int().min(0).default(0),
    })).optional(),
  }).optional(),
  // Affixes for rare+ items
  affixPools: z.object({
    prefix: z.array(z.string()).optional(),
    suffix: z.array(z.string()).optional(),
  }).optional(),
  // Global metadata
  createdAt: StringTimestampSchema,
  version: z.number().int().min(1).default(1),
  deprecated: z.boolean().default(false),
});

// Item search/filter
export const ItemFilterSchema = z.object({
  slot: SlotSchema.optional(),
  rarity: RaritySchema.optional(),
  minLevel: z.number().int().min(1).optional(),
  maxLevel: z.number().int().min(1).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(), // text search
  sortBy: z.enum(['name', 'rarity', 'level', 'value', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ItemInstance = z.infer<typeof ItemInstanceSchema>;
export type Inventory = z.infer<typeof InventorySchema>;
export type Equipment = z.infer<typeof EquipmentSchema>;
export type UseItemRequest = z.infer<typeof UseItemRequestSchema>;
export type EquipItemRequest = z.infer<typeof EquipItemRequestSchema>;
export type TransferItemRequest = z.infer<typeof TransferItemRequestSchema>;
export type CraftingRecipe = z.infer<typeof CraftingRecipeSchema>;
export type ItemArchetypeExtended = z.infer<typeof ItemArchetypeExtendedSchema>;
export type ItemFilter = z.infer<typeof ItemFilterSchema>;
