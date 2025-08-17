import { z } from 'zod';

// Player action schemas
export const ActionTypeSchema = z.enum([
  'MOVE', 'LOOK', 'TALK', 'ATTACK', 'USE', 'TAKE', 'DROP', 
  'EQUIP', 'UNEQUIP', 'CRAFT', 'CAST', 'SEARCH', 'GIVE',
  'TURN_IN_QUEST', 'ACCEPT_QUEST', 'CUSTOM_SKILL_CHECK'
]);

export const SkillSchema = z.enum([
  'athletics', 'stealth', 'persuasion', 'arcana', 'survival',
  'investigation', 'insight', 'deception', 'intimidation'
]);

export const DifficultySchema = z.enum(['trivial', 'easy', 'normal', 'hard', 'extreme']);

// Base action schema
export const BaseActionSchema = z.object({
  type: ActionTypeSchema,
  idempotencyKey: z.string().uuid(),
  timestamp: z.number().int().positive()
});

// Specific action schemas
export const MoveActionSchema = BaseActionSchema.extend({
  type: z.literal('MOVE'),
  direction: z.enum(['north', 'south', 'east', 'west', 'up', 'down']).optional(),
  target: z.string().optional() // location key or portal name
});

export const LookActionSchema = BaseActionSchema.extend({
  type: z.literal('LOOK'),
  target: z.string().optional() // object, mob, or location
});

export const TalkActionSchema = BaseActionSchema.extend({
  type: z.literal('TALK'),
  target: z.string(), // NPC key or player ID
  topic: z.string().optional(),
  message: z.string().max(500).optional()
});

export const AttackActionSchema = BaseActionSchema.extend({
  type: z.literal('ATTACK'),
  target: z.string(), // mob key
  style: z.enum(['melee', 'ranged', 'cast']).optional(),
  ability: z.string().optional()
});

export const UseActionSchema = BaseActionSchema.extend({
  type: z.literal('USE'),
  itemId: z.string(),
  target: z.string().optional() // target for item usage
});

export const TakeActionSchema = BaseActionSchema.extend({
  type: z.literal('TAKE'),
  target: z.string(), // item key or instance ID
  quantity: z.number().int().min(1).optional()
});

export const DropActionSchema = BaseActionSchema.extend({
  type: z.literal('DROP'),
  itemId: z.string(),
  quantity: z.number().int().min(1).optional()
});

export const EquipActionSchema = BaseActionSchema.extend({
  type: z.literal('EQUIP'),
  itemId: z.string(),
  slot: z.string().optional()
});

export const CustomSkillCheckActionSchema = BaseActionSchema.extend({
  type: z.literal('CUSTOM_SKILL_CHECK'),
  description: z.string().max(200),
  skill: SkillSchema.optional(),
  difficulty: DifficultySchema.optional(),
  impliedPrimitive: ActionTypeSchema.optional()
});

// Union of all actions
export const GameActionSchema = z.discriminatedUnion('type', [
  MoveActionSchema,
  LookActionSchema,
  TalkActionSchema,
  AttackActionSchema,
  UseActionSchema,
  TakeActionSchema,
  DropActionSchema,
  EquipActionSchema,
  CustomSkillCheckActionSchema
]);

// Action Plan schema (for AI interpreter)
export const ActionPlanSchema = z.object({
  primary: GameActionSchema,
  alternates: z.array(z.string()).max(3).optional(),
  rationale: z.string().max(200).optional(),
  confidence: z.number().min(0).max(1).optional()
});

// Game event schemas
export const GameEventTypeSchema = z.enum([
  'MOVED', 'LOOKED', 'TALKED', 'COMBAT_STARTED', 'COMBAT_RESOLVED',
  'ITEM_OBTAINED', 'ITEM_USED', 'ITEM_EQUIPPED', 'QUEST_ACCEPTED',
  'QUEST_COMPLETED', 'LEVEL_UP', 'DEATH', 'RESPAWN', 'SKILL_CHECK'
]);

export const GameEventSchema = z.object({
  id: z.string().uuid(),
  type: GameEventTypeSchema,
  worldId: z.string(),
  userId: z.string(),
  timestamp: z.number().int().positive(),
  data: z.record(z.any()),
  visible: z.boolean().default(true),
  broadcast: z.boolean().default(false)
});

// Player state schemas
export const PlayerStatsSchema = z.object({
  level: z.number().int().min(1).max(100),
  experience: z.number().int().min(0),
  health: z.number().int().min(0),
  maxHealth: z.number().int().min(1),
  mana: z.number().int().min(0).optional(),
  maxMana: z.number().int().min(0).optional(),
  stamina: z.number().int().min(0).optional(),
  maxStamina: z.number().int().min(0).optional(),
  attributes: z.object({
    strength: z.number().int().min(1),
    dexterity: z.number().int().min(1),
    intelligence: z.number().int().min(1),
    vitality: z.number().int().min(1),
    wisdom: z.number().int().min(1),
    charisma: z.number().int().min(1)
  })
});

export const PlayerLocationSchema = z.object({
  worldId: z.string(),
  locationKey: z.string(),
  lastMoved: z.number().int().positive()
});

export const PlayerStateSchema = z.object({
  userId: z.string(),
  stats: PlayerStatsSchema,
  location: PlayerLocationSchema,
  inventory: z.array(z.object({
    itemInstanceId: z.string(),
    quantity: z.number().int().min(1),
    equipped: z.boolean().default(false),
    slot: z.string().optional()
  })),
  activeQuests: z.array(z.object({
    questKey: z.string(),
    progress: z.record(z.string(), z.number()),
    startedAt: z.number().int().positive()
  })),
  completedQuests: z.array(z.string()),
  cooldowns: z.record(z.string(), z.number().int().min(0)),
  conditions: z.array(z.object({
    type: z.string(),
    duration: z.number().int().min(0),
    value: z.number().optional()
  })),
  lastAction: z.number().int().positive().optional()
});

// Context packet for AI services
export const ContextPacketSchema = z.object({
  worldId: z.string(),
  userId: z.string(),
  location: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    exits: z.array(z.string()),
    biome: z.string()
  }),
  objects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    tags: z.array(z.string()),
    interactable: z.boolean().default(true)
  })),
  npcs: z.array(z.object({
    id: z.string(),
    name: z.string(),
    disposition: z.enum(['friendly', 'neutral', 'hostile']),
    faction: z.string().optional()
  })),
  mobs: z.array(z.object({
    id: z.string(),
    name: z.string(),
    level: z.number().int().min(1),
    health: z.number().int().min(0),
    hostile: z.boolean()
  })),
  skills: z.array(SkillSchema),
  inventory: z.array(z.object({
    id: z.string(),
    name: z.string(),
    slot: z.string(),
    usable: z.boolean()
  })),
  activeQuests: z.array(z.object({
    key: z.string(),
    name: z.string(),
    currentStep: z.string()
  })),
  cooldowns: z.record(z.string(), z.number()),
  playerStats: PlayerStatsSchema
});

// Narrative response schema
export const NarrativeResponseSchema = z.object({
  text: z.string().min(1).max(2000),
  suggestions: z.array(z.string()).max(3),
  mood: z.enum(['neutral', 'positive', 'negative', 'mysterious', 'urgent']).optional(),
  style: z.enum(['descriptive', 'action', 'dialogue', 'system']).optional()
});

// Export types
export type ActionType = z.infer<typeof ActionTypeSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;
export type GameAction = z.infer<typeof GameActionSchema>;
export type ActionPlan = z.infer<typeof ActionPlanSchema>;
export type GameEvent = z.infer<typeof GameEventSchema>;
export type GameEventType = z.infer<typeof GameEventTypeSchema>;
export type PlayerStats = z.infer<typeof PlayerStatsSchema>;
export type PlayerLocation = z.infer<typeof PlayerLocationSchema>;
export type PlayerState = z.infer<typeof PlayerStateSchema>;
export type ContextPacket = z.infer<typeof ContextPacketSchema>;
export type NarrativeResponse = z.infer<typeof NarrativeResponseSchema>;