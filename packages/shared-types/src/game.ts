import { z } from 'zod';
import { IdSchema, TimestampSchema, CoordinateSchema, StatsSchema } from './common';

// Game Actions
export const GameActionTypeSchema = z.enum([
  'MOVE', 'LOOK', 'TALK', 'ATTACK', 'USE_ITEM', 'TAKE', 'DROP', 'CRAFT', 
  'CAST', 'REST', 'EQUIP', 'UNEQUIP', 'TRADE', 'TURN_IN_QUEST', 'ACCEPT_QUEST',
  'SEARCH', 'GIVE', 'CUSTOM_SKILL_CHECK'
]);

export const BaseGameActionSchema = z.object({
  type: GameActionTypeSchema,
  worldId: IdSchema,
  userId: IdSchema,
  idempotencyKey: z.string().uuid(),
  timestamp: TimestampSchema.default(() => new Date())
});

export const MoveActionSchema = BaseGameActionSchema.extend({
  type: z.literal('MOVE'),
  payload: z.object({
    direction: z.enum(['north', 'south', 'east', 'west', 'up', 'down']).optional(),
    target: z.string().optional() // location key or coordinate
  })
});

export const LookActionSchema = BaseGameActionSchema.extend({
  type: z.literal('LOOK'),
  payload: z.object({
    target: z.string().optional() // entity, item, or location
  })
});

export const TalkActionSchema = BaseGameActionSchema.extend({
  type: z.literal('TALK'),
  payload: z.object({
    target: z.string(), // NPC key
    topic: z.string().optional()
  })
});

export const AttackActionSchema = BaseGameActionSchema.extend({
  type: z.literal('ATTACK'),
  payload: z.object({
    target: z.string(), // mob key
    style: z.enum(['melee', 'ranged', 'cast']).optional()
  })
});

export const UseItemActionSchema = BaseGameActionSchema.extend({
  type: z.literal('USE_ITEM'),
  payload: z.object({
    itemInstanceId: IdSchema,
    target: z.string().optional() // target entity if applicable
  })
});

export const CustomSkillCheckActionSchema = BaseGameActionSchema.extend({
  type: z.literal('CUSTOM_SKILL_CHECK'),
  payload: z.object({
    description: z.string().max(200),
    skill: z.enum(['athletics', 'stealth', 'persuasion', 'arcana', 'survival', 'crafting']).optional(),
    difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
    impliedPrimitive: GameActionTypeSchema.optional()
  })
});

export const GameActionSchema = z.discriminatedUnion('type', [
  MoveActionSchema,
  LookActionSchema,
  TalkActionSchema,
  AttackActionSchema,
  UseItemActionSchema,
  CustomSkillCheckActionSchema
]);

// Game Events
export const GameEventTypeSchema = z.enum([
  'PLAYER_MOVED', 'COMBAT_STARTED', 'COMBAT_TURN', 'COMBAT_ENDED', 
  'ITEM_DROPPED', 'ITEM_PICKED_UP', 'QUEST_STARTED', 'QUEST_COMPLETED',
  'LEVEL_UP', 'SKILL_CHECK', 'NPC_INTERACTION', 'WORLD_EVENT'
]);

export const BaseGameEventSchema = z.object({
  id: IdSchema,
  type: GameEventTypeSchema,
  worldId: IdSchema,
  userId: IdSchema.optional(), // null for world events
  timestamp: TimestampSchema,
  data: z.record(z.string(), z.any())
});

export const PlayerMovedEventSchema = BaseGameEventSchema.extend({
  type: z.literal('PLAYER_MOVED'),
  data: z.object({
    fromLocation: z.string(),
    toLocation: z.string(),
    coordinate: CoordinateSchema
  })
});

export const CombatTurnEventSchema = BaseGameEventSchema.extend({
  type: z.literal('COMBAT_TURN'),
  data: z.object({
    encounterId: IdSchema,
    turn: z.number().int().min(1),
    actor: z.string(), // 'player' or mob key
    action: z.string(),
    damage: z.number().int().min(0).optional(),
    healing: z.number().int().min(0).optional(),
    effects: z.array(z.string()).default([])
  })
});

export const ItemDroppedEventSchema = BaseGameEventSchema.extend({
  type: z.literal('ITEM_DROPPED'),
  data: z.object({
    itemInstanceId: IdSchema,
    archetypeSlug: z.string(),
    quantity: z.number().int().min(1).default(1),
    source: z.string(), // mob key, chest, etc.
    location: z.string()
  })
});

// Player State
export const PlayerStatsSchema = z.object({
  level: z.number().int().min(1).default(1),
  experience: z.number().int().min(0).default(0),
  health: z.number().int().min(0),
  maxHealth: z.number().int().min(1),
  mana: z.number().int().min(0).default(0),
  maxMana: z.number().int().min(0).default(0),
  strength: z.number().int().min(1).default(10),
  dexterity: z.number().int().min(1).default(10),
  intelligence: z.number().int().min(1).default(10),
  vitality: z.number().int().min(1).default(10)
});

export const PlayerStateSchema = z.object({
  id: IdSchema,
  worldId: IdSchema,
  userId: IdSchema,
  characterName: z.string().min(1).max(50),
  currentLocation: z.string(),
  coordinate: CoordinateSchema,
  stats: PlayerStatsSchema,
  activeQuests: z.array(z.string()).default([]),
  completedQuests: z.array(z.string()).default([]),
  faction: z.string().optional(),
  reputation: z.record(z.string(), z.number()).default({}),
  cooldowns: z.record(z.string(), TimestampSchema).default({}),
  statusEffects: z.array(z.object({
    effect: z.string(),
    duration: z.number().int().min(0),
    strength: z.number().default(1)
  })).default([]),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  lastActionAt: TimestampSchema.optional()
});

// Combat
export const CombatEncounterSchema = z.object({
  id: IdSchema,
  worldId: IdSchema,
  userId: IdSchema,
  mobKeys: z.array(z.string()),
  status: z.enum(['active', 'completed', 'fled']),
  turn: z.number().int().min(1).default(1),
  playerInitiative: z.number().int(),
  mobInitiatives: z.record(z.string(), z.number().int()),
  startedAt: TimestampSchema,
  endedAt: TimestampSchema.optional(),
  result: z.enum(['victory', 'defeat', 'fled']).optional()
});

// API Schemas
export const ExecuteActionRequestSchema = z.object({
  action: GameActionSchema
});

export const FreeFormActionRequestSchema = z.object({
  worldId: IdSchema,
  input: z.string().min(1).max(500),
  idempotencyKey: z.string().uuid()
});

export const GameStateResponseSchema = z.object({
  playerState: PlayerStateSchema,
  currentLocation: z.object({
    key: z.string(),
    name: z.string(),
    description: z.string(),
    exits: z.array(z.string()),
    entities: z.array(z.object({
      key: z.string(),
      name: z.string(),
      type: z.enum(['npc', 'mob', 'item', 'feature'])
    }))
  }),
  recentEvents: z.array(BaseGameEventSchema),
  activeEncounter: CombatEncounterSchema.optional()
});

// Types
export type GameActionType = z.infer<typeof GameActionTypeSchema>;
export type GameAction = z.infer<typeof GameActionSchema>;
export type MoveAction = z.infer<typeof MoveActionSchema>;
export type LookAction = z.infer<typeof LookActionSchema>;
export type TalkAction = z.infer<typeof TalkActionSchema>;
export type AttackAction = z.infer<typeof AttackActionSchema>;
export type UseItemAction = z.infer<typeof UseItemActionSchema>;
export type CustomSkillCheckAction = z.infer<typeof CustomSkillCheckActionSchema>;

export type GameEventType = z.infer<typeof GameEventTypeSchema>;
export type GameEvent = z.infer<typeof BaseGameEventSchema>;
export type PlayerMovedEvent = z.infer<typeof PlayerMovedEventSchema>;
export type CombatTurnEvent = z.infer<typeof CombatTurnEventSchema>;
export type ItemDroppedEvent = z.infer<typeof ItemDroppedEventSchema>;

export type PlayerStats = z.infer<typeof PlayerStatsSchema>;
export type PlayerState = z.infer<typeof PlayerStateSchema>;
export type CombatEncounter = z.infer<typeof CombatEncounterSchema>;

export type ExecuteActionRequest = z.infer<typeof ExecuteActionRequestSchema>;
export type FreeFormActionRequest = z.infer<typeof FreeFormActionRequestSchema>;
export type GameStateResponse = z.infer<typeof GameStateResponseSchema>;