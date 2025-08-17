import { z } from 'zod';
import { GameCommandSchema } from './game';

// Context packet for AI services
export const ContextPacketSchema = z.object({
  worldId: z.string(),
  location: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    biome: z.string(),
    exits: z.array(z.object({
      direction: z.string(),
      target: z.string(),
      description: z.string().optional(),
    })),
  }),
  objects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    interactable: z.boolean().default(true),
  })),
  npcs: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    disposition: z.enum(['friendly', 'neutral', 'hostile']),
    canTalk: z.boolean().default(true),
  })),
  mobs: z.array(z.object({
    id: z.string(),
    name: z.string(),
    level: z.number().int(),
    hostile: z.boolean().default(true),
  })),
  player: z.object({
    level: z.number().int(),
    health: z.object({
      current: z.number().int(),
      max: z.number().int(),
    }),
    mana: z.object({
      current: z.number().int(),
      max: z.number().int(),
    }).optional(),
    skills: z.array(z.string()),
    activeQuests: z.array(z.object({
      key: z.string(),
      name: z.string(),
      currentStep: z.string().optional(),
    })),
  }),
  inventory: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number().int(),
    usable: z.boolean().default(false),
  })),
  cooldowns: z.record(z.string(), z.number()).optional(), // ability -> seconds remaining
  recentActions: z.array(z.object({
    action: z.string(),
    timestamp: z.string(),
    outcome: z.string().optional(),
  })).optional(),
});

// Action plan (interpreter output)
export const ActionPlanSchema = z.object({
  primary: GameCommandSchema,
  alternates: z.array(z.string()).max(3).optional(),
  rationale: z.string().max(200).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

// Interpreter request
export const InterpreterRequestSchema = z.object({
  text: z.string().min(1).max(500),
  context: ContextPacketSchema,
  userId: z.string().optional(), // for personalization
  previousActions: z.array(z.string()).optional(), // recent action history
});

// Interpreter response
export const InterpreterResponseSchema = z.object({
  actionPlan: ActionPlanSchema,
  processingTime: z.number().optional(),
  model: z.string().optional(),
  cached: z.boolean().default(false),
});

// Narrative request
export const NarrativeRequestSchema = z.object({
  outcome: z.object({
    success: z.boolean(),
    events: z.array(z.record(z.string(), z.unknown())),
    message: z.string().optional(),
  }),
  context: ContextPacketSchema,
  action: GameCommandSchema.optional(),
  tone: z.enum(['grim', 'whimsical', 'heroic', 'dark', 'lighthearted']).optional(),
});

// Narrative response
export const NarrativeResponseSchema = z.object({
  text: z.string(),
  suggestions: z.array(z.string()).max(3),
  mood: z.string().optional(),
  processingTime: z.number().optional(),
  model: z.string().optional(),
  cached: z.boolean().default(false),
});

// World generation prompt
export const WorldGenPromptSchema = z.object({
  userPrompt: z.string().min(10).max(2000),
  tone: z.enum(['grim', 'whimsical', 'heroic', 'dark', 'lighthearted']).optional(),
  themes: z.array(z.string()).max(5).optional(),
  constraints: z.object({
    minLocations: z.number().int().min(20).default(30),
    minMobs: z.number().int().min(15).default(20),
    minQuests: z.number().int().min(8).default(10),
    minItems: z.number().int().min(15).default(20),
    maxLevel: z.number().int().min(10).max(100).default(50),
  }).optional(),
  contentFilters: z.object({
    allowViolence: z.boolean().default(true),
    allowDarkThemes: z.boolean().default(true),
    ageRating: z.enum(['E', 'T', 'M']).default('T'),
  }).optional(),
});

// Content moderation
export const ModerationResultSchema = z.object({
  approved: z.boolean(),
  confidence: z.number().min(0).max(1),
  flags: z.array(z.object({
    category: z.enum(['hate', 'violence', 'sexual', 'profanity', 'spam', 'pii']),
    severity: z.enum(['low', 'medium', 'high']),
    text: z.string().optional(),
  })),
  autoRewrite: z.object({
    applied: z.boolean(),
    original: z.string(),
    rewritten: z.string(),
  }).optional(),
});

// AI service health
export const AIServiceHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  services: z.object({
    ollama: z.enum(['healthy', 'unhealthy']),
    interpreter: z.enum(['healthy', 'unhealthy']),
    narrator: z.enum(['healthy', 'unhealthy']),
    worldgen: z.enum(['healthy', 'unhealthy']),
  }),
  models: z.record(z.string(), z.object({
    loaded: z.boolean(),
    size: z.string().optional(),
    lastUsed: z.string().optional(),
  })),
  performance: z.object({
    avgLatency: z.number().optional(),
    requestsPerMinute: z.number().optional(),
    cacheHitRate: z.number().min(0).max(1).optional(),
  }).optional(),
});

export type ContextPacket = z.infer<typeof ContextPacketSchema>;
export type ActionPlan = z.infer<typeof ActionPlanSchema>;
export type InterpreterRequest = z.infer<typeof InterpreterRequestSchema>;
export type InterpreterResponse = z.infer<typeof InterpreterResponseSchema>;
export type NarrativeRequest = z.infer<typeof NarrativeRequestSchema>;
export type NarrativeResponse = z.infer<typeof NarrativeResponseSchema>;
export type WorldGenPrompt = z.infer<typeof WorldGenPromptSchema>;
export type ModerationResult = z.infer<typeof ModerationResultSchema>;
export type AIServiceHealth = z.infer<typeof AIServiceHealthSchema>;
