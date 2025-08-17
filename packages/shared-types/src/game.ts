import { z } from 'zod';
import { IdSchema, StringTimestampSchema, StatsSchema } from './common';

// Player state
export const PlayerStateSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  worldId: IdSchema,
  currentLocationKey: z.string(),
  level: z.number().int().min(1).default(1),
  experience: z.number().int().min(0).default(0),
  stats: StatsSchema,
  health: z.object({
    current: z.number().int().min(0),
    max: z.number().int().min(1),
  }),
  mana: z.object({
    current: z.number().int().min(0),
    max: z.number().int().min(0),
  }).optional(),
  gold: z.number().int().min(0).default(0),
  activeQuests: z.array(z.object({
    questKey: z.string(),
    progress: z.record(z.string(), z.number()), // step progress
    startedAt: StringTimestampSchema,
  })),
  completedQuests: z.array(z.string()),
  cooldowns: z.record(z.string(), StringTimestampSchema).optional(),
  statusEffects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    duration: z.number().int().min(0),
    effects: StatsSchema,
  })).optional(),
});

// Game commands
export const MoveCommandSchema = z.object({
  type: z.literal('MOVE'),
  direction: z.enum(['north', 'south', 'east', 'west', 'up', 'down']).optional(),
  target: z.string().optional(),
});

export const LookCommandSchema = z.object({
  type: z.literal('LOOK'),
  target: z.string().optional(),
});

export const TalkCommandSchema = z.object({
  type: z.literal('TALK'),
  target: z.string(),
  topic: z.string().optional(),
});

export const UseCommandSchema = z.object({
  type: z.literal('USE'),
  itemId: z.string(),
  target: z.string().optional(),
});

export const AttackCommandSchema = z.object({
  type: z.literal('ATTACK'),
  target: z.string(),
  style: z.enum(['melee', 'ranged', 'cast']).optional(),
});

export const GiveCommandSchema = z.object({
  type: z.literal('GIVE'),
  itemId: z.string(),
  target: z.string(),
});

export const SearchCommandSchema = z.object({
  type: z.literal('SEARCH'),
  target: z.string().optional(),
});

export const CraftCommandSchema = z.object({
  type: z.literal('CRAFT'),
  recipe: z.string(),
  quantity: z.number().int().min(1).default(1),
});

export const CastCommandSchema = z.object({
  type: z.literal('CAST'),
  spell: z.string(),
  target: z.string().optional(),
});

export const CustomSkillCheckCommandSchema = z.object({
  type: z.literal('CUSTOM_SKILL_CHECK'),
  description: z.string(),
  skill: z.enum(['athletics', 'stealth', 'persuasion', 'arcana', 'survival', 'investigation', 'insight']).optional(),
  difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
  impliedPrimitive: z.enum(['MOVE', 'USE', 'TALK', 'ATTACK', 'LOOK', 'SEARCH']).optional(),
});

export const GameCommandSchema = z.discriminatedUnion('type', [
  MoveCommandSchema,
  LookCommandSchema,
  TalkCommandSchema,
  UseCommandSchema,
  AttackCommandSchema,
  GiveCommandSchema,
  SearchCommandSchema,
  CraftCommandSchema,
  CastCommandSchema,
  CustomSkillCheckCommandSchema,
]);

// Command request
export const CommandRequestSchema = z.object({
  worldId: IdSchema,
  command: GameCommandSchema,
  idempotencyKey: z.string().uuid(),
});

// Free-form command request
export const FreeformCommandRequestSchema = z.object({
  worldId: IdSchema,
  text: z.string().min(1).max(500),
  idempotencyKey: z.string().uuid(),
});

// Game events
export const StateUpdatedEventSchema = z.object({
  type: z.literal('STATE_UPDATED'),
  playerId: IdSchema,
  changes: z.record(z.string(), z.unknown()),
});

export const CombatResolvedEventSchema = z.object({
  type: z.literal('COMBAT_RESOLVED'),
  encounterId: z.string(),
  participants: z.array(z.object({
    id: z.string(),
    type: z.enum(['player', 'mob']),
    name: z.string(),
  })),
  turns: z.array(z.object({
    actor: z.string(),
    action: z.string(),
    target: z.string().optional(),
    damage: z.number().optional(),
    healing: z.number().optional(),
    effects: z.array(z.string()).optional(),
  })),
  outcome: z.enum(['victory', 'defeat', 'fled']),
  rewards: z.object({
    experience: z.number().int().min(0).default(0),
    gold: z.number().int().min(0).default(0),
  }).optional(),
});

export const LootDroppedEventSchema = z.object({
  type: z.literal('LOOT_DROPPED'),
  locationKey: z.string(),
  items: z.array(z.object({
    instanceId: z.string(),
    archetypeSlug: z.string(),
    quantity: z.number().int().min(1),
  })),
  source: z.string().optional(), // mob key or container
});

export const QuestProgressEventSchema = z.object({
  type: z.literal('QUEST_PROGRESS'),
  playerId: IdSchema,
  questKey: z.string(),
  stepProgress: z.record(z.string(), z.number()),
  completed: z.boolean().default(false),
});

export const GameEventSchema = z.discriminatedUnion('type', [
  StateUpdatedEventSchema,
  CombatResolvedEventSchema,
  LootDroppedEventSchema,
  QuestProgressEventSchema,
]);

// Command outcome
export const CommandOutcomeSchema = z.object({
  success: z.boolean(),
  events: z.array(GameEventSchema),
  message: z.string().optional(),
  stateHash: z.string().optional(),
  narrative: z.object({
    text: z.string(),
    suggestions: z.array(z.string()).max(3),
  }).optional(),
});

// Combat log entry
export const CombatLogSchema = z.object({
  id: IdSchema,
  worldId: IdSchema,
  encounterId: z.string(),
  participants: z.array(z.string()),
  log: z.array(z.object({
    turn: z.number().int().min(1),
    actor: z.string(),
    action: z.string(),
    target: z.string().optional(),
    roll: z.number().optional(),
    damage: z.number().optional(),
    healing: z.number().optional(),
    effects: z.array(z.string()).optional(),
  })),
  outcome: z.enum(['victory', 'defeat', 'fled']),
  createdAt: StringTimestampSchema,
});

// Action record (for audit/replay)
export const ActionRecordSchema = z.object({
  id: IdSchema,
  worldId: IdSchema,
  userId: IdSchema,
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
  idempotencyKey: z.string(),
  outcome: CommandOutcomeSchema.optional(),
  createdAt: StringTimestampSchema,
});

export type PlayerState = z.infer<typeof PlayerStateSchema>;
export type MoveCommand = z.infer<typeof MoveCommandSchema>;
export type LookCommand = z.infer<typeof LookCommandSchema>;
export type TalkCommand = z.infer<typeof TalkCommandSchema>;
export type UseCommand = z.infer<typeof UseCommandSchema>;
export type AttackCommand = z.infer<typeof AttackCommandSchema>;
export type GiveCommand = z.infer<typeof GiveCommandSchema>;
export type SearchCommand = z.infer<typeof SearchCommandSchema>;
export type CraftCommand = z.infer<typeof CraftCommandSchema>;
export type CastCommand = z.infer<typeof CastCommandSchema>;
export type CustomSkillCheckCommand = z.infer<typeof CustomSkillCheckCommandSchema>;
export type GameCommand = z.infer<typeof GameCommandSchema>;
export type CommandRequest = z.infer<typeof CommandRequestSchema>;
export type FreeformCommandRequest = z.infer<typeof FreeformCommandRequestSchema>;
export type StateUpdatedEvent = z.infer<typeof StateUpdatedEventSchema>;
export type CombatResolvedEvent = z.infer<typeof CombatResolvedEventSchema>;
export type LootDroppedEvent = z.infer<typeof LootDroppedEventSchema>;
export type QuestProgressEvent = z.infer<typeof QuestProgressEventSchema>;
export type GameEvent = z.infer<typeof GameEventSchema>;
export type CommandOutcome = z.infer<typeof CommandOutcomeSchema>;
export type CombatLog = z.infer<typeof CombatLogSchema>;
export type ActionRecord = z.infer<typeof ActionRecordSchema>;
