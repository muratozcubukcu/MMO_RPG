import { z } from 'zod';
import { IdSchema, CoordinateSchema } from './common';
import { GameActionTypeSchema } from './game';

// Context Packet for AI services
export const ContextPacketSchema = z.object({
  worldId: IdSchema,
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
    tags: z.array(z.string())
  })).default([]),
  npcs: z.array(z.object({
    id: z.string(),
    name: z.string(),
    disposition: z.enum(['friendly', 'neutral', 'hostile', 'unknown'])
  })).default([]),
  mobs: z.array(z.object({
    id: z.string(),
    name: z.string(),
    level: z.number().int(),
    aggressive: z.boolean()
  })).default([]),
  skills: z.array(z.string()).default([]),
  inventory: z.array(z.object({
    id: z.string(),
    name: z.string(),
    slot: z.string(),
    equipped: z.boolean().default(false)
  })).default([]),
  activeQuests: z.array(z.object({
    id: z.string(),
    name: z.string(),
    currentStep: z.string()
  })).default([]),
  cooldowns: z.record(z.string(), z.number()).default({}),
  playerStats: z.object({
    level: z.number().int(),
    health: z.number().int(),
    maxHealth: z.number().int(),
    mana: z.number().int(),
    maxMana: z.number().int()
  })
});

// Action Plan Schema (Interpreter output)
export const ActionPlanSchema = z.object({
  primary: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('MOVE'),
      direction: z.enum(['north', 'south', 'east', 'west', 'up', 'down']).optional(),
      target: z.string().optional()
    }),
    z.object({
      type: z.literal('LOOK'),
      target: z.string().optional()
    }),
    z.object({
      type: z.literal('TALK'),
      target: z.string(),
      topic: z.string().optional()
    }),
    z.object({
      type: z.literal('ATTACK'),
      target: z.string(),
      style: z.enum(['melee', 'ranged', 'cast']).optional()
    }),
    z.object({
      type: z.literal('USE_ITEM'),
      itemId: z.string(),
      target: z.string().optional()
    }),
    z.object({
      type: z.literal('GIVE'),
      itemId: z.string(),
      target: z.string()
    }),
    z.object({
      type: z.literal('SEARCH'),
      target: z.string().optional()
    }),
    z.object({
      type: z.literal('CRAFT'),
      recipe: z.string()
    }),
    z.object({
      type: z.literal('CAST'),
      spell: z.string(),
      target: z.string().optional()
    }),
    z.object({
      type: z.literal('CUSTOM_SKILL_CHECK'),
      description: z.string().max(200),
      skill: z.enum(['athletics', 'stealth', 'persuasion', 'arcana', 'survival', 'crafting']).optional(),
      difficulty: z.enum(['easy', 'normal', 'hard']).optional(),
      impliedPrimitive: GameActionTypeSchema.optional()
    })
  ]),
  alternates: z.array(z.string()).max(3).optional(),
  rationale: z.string().max(200).optional(),
  confidence: z.number().min(0).max(1).default(1)
});

// Game Outcome Schema (from rules engine)
export const GameOutcomeSchema = z.object({
  success: z.boolean(),
  events: z.array(z.object({
    kind: z.string(),
    data: z.record(z.string(), z.any())
  })),
  drops: z.array(z.string()).default([]),
  stateHash: z.string(),
  changes: z.object({
    health: z.number().int().optional(),
    mana: z.number().int().optional(),
    experience: z.number().int().optional(),
    location: z.string().optional(),
    inventory: z.array(z.object({
      action: z.enum(['add', 'remove', 'update']),
      itemId: z.string(),
      quantity: z.number().int().optional()
    })).optional()
  }).default({})
});

// Narrative Response Schema (Narrator output)
export const NarrativeResponseSchema = z.object({
  text: z.string().min(1).max(1000),
  suggestions: z.array(z.string()).max(3).default([]),
  mood: z.enum(['neutral', 'tense', 'triumphant', 'mysterious', 'dangerous']).default('neutral'),
  emphasis: z.enum(['none', 'success', 'failure', 'discovery', 'combat']).default('none')
});

// API Request/Response schemas
export const InterpretRequestSchema = z.object({
  input: z.string().min(1).max(500),
  context: ContextPacketSchema,
  userId: IdSchema,
  worldId: IdSchema
});

export const InterpretResponseSchema = z.object({
  actionPlan: ActionPlanSchema,
  processingTime: z.number().min(0),
  cached: z.boolean().default(false)
});

export const NarrateRequestSchema = z.object({
  outcome: GameOutcomeSchema,
  context: ContextPacketSchema,
  actionPlan: ActionPlanSchema.optional(),
  userId: IdSchema,
  worldId: IdSchema
});

export const NarrateResponseSchema = z.object({
  narrative: NarrativeResponseSchema,
  processingTime: z.number().min(0),
  cached: z.boolean().default(false)
});

// Content Generation schemas
export const ContentProposalSchema = z.object({
  id: IdSchema,
  type: z.enum(['item_archetype', 'mob', 'location', 'quest']),
  worldId: IdSchema,
  proposedBy: IdSchema, // user or system
  status: z.enum(['pending', 'approved', 'rejected', 'needs_review']),
  data: z.record(z.string(), z.any()),
  moderationFlags: z.array(z.string()).default([]),
  createdAt: z.date(),
  reviewedAt: z.date().optional(),
  reviewedBy: IdSchema.optional()
});

export const EncounterTemplateSchema = z.object({
  id: IdSchema,
  worldId: IdSchema,
  biome: z.string(),
  type: z.enum(['ambient', 'interrupt', 'quest']),
  name: z.string(),
  description: z.string(),
  triggers: z.array(z.string()).default([]),
  entities: z.array(z.string()).default([]),
  rewards: z.array(z.string()).default([]),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic']).default('common'),
  levelRange: z.object({
    min: z.number().int().min(1),
    max: z.number().int().min(1)
  })
});

// Cache schemas
export const InterpreterCacheKeySchema = z.object({
  contextHash: z.string(),
  userTextHash: z.string()
});

export const NarrativeCacheKeySchema = z.object({
  worldId: IdSchema,
  stateHash: z.string(),
  actionHash: z.string()
});

// Types
export type ContextPacket = z.infer<typeof ContextPacketSchema>;
export type ActionPlan = z.infer<typeof ActionPlanSchema>;
export type GameOutcome = z.infer<typeof GameOutcomeSchema>;
export type NarrativeResponse = z.infer<typeof NarrativeResponseSchema>;

export type InterpretRequest = z.infer<typeof InterpretRequestSchema>;
export type InterpretResponse = z.infer<typeof InterpretResponseSchema>;
export type NarrateRequest = z.infer<typeof NarrateRequestSchema>;
export type NarrateResponse = z.infer<typeof NarrateResponseSchema>;

export type ContentProposal = z.infer<typeof ContentProposalSchema>;
export type EncounterTemplate = z.infer<typeof EncounterTemplateSchema>;

export type InterpreterCacheKey = z.infer<typeof InterpreterCacheKeySchema>;
export type NarrativeCacheKey = z.infer<typeof NarrativeCacheKeySchema>;