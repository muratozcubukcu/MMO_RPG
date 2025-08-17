import { z } from 'zod';
import { IdSchema, TimestampSchema, RaritySchema, ItemSlotSchema, StatsSchema } from './common';

// Item Instance Schema
export const ItemInstanceSchema = z.object({
  id: IdSchema,
  archetypeId: IdSchema,
  archetypeSlug: z.string(),
  mintWorldId: IdSchema,
  rollData: z.record(z.string(), z.any()).default({}), // affixes, enchants, etc.
  boundToUserId: IdSchema.optional(),
  durability: z.number().min(0).max(100).default(100),
  stackSize: z.number().int().min(1).default(1),
  createdAt: TimestampSchema,
  lastUsedAt: TimestampSchema.optional()
});

// Inventory Schema
export const InventorySchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  worldId: IdSchema.optional(), // null for global inventory
  capacity: z.number().int().min(1).default(50),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

export const InventoryItemSchema = z.object({
  inventoryId: IdSchema,
  itemInstanceId: IdSchema,
  quantity: z.number().int().min(1).default(1),
  slot: z.number().int().min(0).optional(), // for ordered inventory
  addedAt: TimestampSchema
});

// Equipment Schema
export const EquipmentSlotSchema = z.object({
  userId: IdSchema,
  worldId: IdSchema,
  slot: ItemSlotSchema,
  itemInstanceId: IdSchema.optional(),
  equippedAt: TimestampSchema.optional()
});

// Item Transfer Schema
export const ItemTransferSchema = z.object({
  id: IdSchema,
  fromInventoryId: IdSchema.optional(),
  toInventoryId: IdSchema.optional(),
  itemInstanceId: IdSchema,
  quantity: z.number().int().min(1),
  reason: z.enum(['trade', 'drop', 'loot', 'craft', 'admin', 'quest_reward']),
  referenceType: z.string().optional(),
  referenceId: IdSchema.optional(),
  createdAt: TimestampSchema
});

// API Schemas
export const InventoryResponseSchema = z.object({
  inventory: InventorySchema,
  items: z.array(z.object({
    instance: ItemInstanceSchema,
    archetype: z.object({
      slug: z.string(),
      name: z.string(),
      description: z.string(),
      rarity: RaritySchema,
      slot: ItemSlotSchema,
      stats: StatsSchema,
      tags: z.array(z.string()),
      value: z.number().int(),
      stackable: z.boolean(),
      maxStack: z.number().int()
    }),
    quantity: z.number().int(),
    slot: z.number().int().optional()
  })),
  equipment: z.record(ItemSlotSchema, ItemInstanceSchema.optional())
});

export const UseItemRequestSchema = z.object({
  itemInstanceId: IdSchema,
  target: z.string().optional(),
  worldId: IdSchema
});

export const EquipItemRequestSchema = z.object({
  itemInstanceId: IdSchema,
  slot: ItemSlotSchema,
  worldId: IdSchema
});

export const TransferItemRequestSchema = z.object({
  itemInstanceId: IdSchema,
  quantity: z.number().int().min(1),
  targetInventoryId: IdSchema,
  reason: ItemTransferSchema.shape.reason
});

export const DropItemRequestSchema = z.object({
  itemInstanceId: IdSchema,
  quantity: z.number().int().min(1),
  worldId: IdSchema,
  location: z.string()
});

// Crafting Schemas
export const CraftingRecipeSchema = z.object({
  id: IdSchema,
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  description: z.string(),
  worldId: IdSchema.optional(), // null for global recipes
  ingredients: z.array(z.object({
    archetypeSlug: z.string(),
    quantity: z.number().int().min(1)
  })),
  outputs: z.array(z.object({
    archetypeSlug: z.string(),
    quantity: z.number().int().min(1),
    chance: z.number().min(0).max(1).default(1)
  })),
  requirements: z.object({
    level: z.number().int().min(1).optional(),
    skill: z.string().optional(),
    skillLevel: z.number().int().min(1).optional(),
    location: z.string().optional() // crafting station
  }).default({}),
  craftTime: z.number().int().min(1).default(1), // seconds
  createdAt: TimestampSchema
});

export const CraftItemRequestSchema = z.object({
  recipeId: IdSchema,
  quantity: z.number().int().min(1).default(1),
  worldId: IdSchema
});

// Types
export type ItemInstance = z.infer<typeof ItemInstanceSchema>;
export type Inventory = z.infer<typeof InventorySchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type EquipmentSlot = z.infer<typeof EquipmentSlotSchema>;
export type ItemTransfer = z.infer<typeof ItemTransferSchema>;

export type InventoryResponse = z.infer<typeof InventoryResponseSchema>;
export type UseItemRequest = z.infer<typeof UseItemRequestSchema>;
export type EquipItemRequest = z.infer<typeof EquipItemRequestSchema>;
export type TransferItemRequest = z.infer<typeof TransferItemRequestSchema>;
export type DropItemRequest = z.infer<typeof DropItemRequestSchema>;

export type CraftingRecipe = z.infer<typeof CraftingRecipeSchema>;
export type CraftItemRequest = z.infer<typeof CraftItemRequestSchema>;