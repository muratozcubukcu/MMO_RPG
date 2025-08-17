import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  InterpreterRequest,
  InterpreterResponse,
  ActionPlan,
  ActionPlanSchema,
  ContextPacket,
} from '@ai-mmo/shared-types';
import { OllamaService } from './ollama.service';
import { createHash } from 'crypto';

@Injectable()
export class InterpreterService {
  private readonly logger = new Logger(InterpreterService.name);

  // System prompt for the interpreter
  private readonly SYSTEM_PROMPT = `You are a text interpreter for a fantasy RPG game. Your job is to convert player input into structured ActionPlan JSON.

RULES:
1. Output ONLY valid JSON matching the ActionPlan schema
2. Use only the allowed command types: MOVE, LOOK, TALK, USE, ATTACK, GIVE, SEARCH, CRAFT, CAST, CUSTOM_SKILL_CHECK
3. Base decisions on the provided context (location, objects, NPCs, inventory)
4. If the input is ambiguous, choose the most reasonable interpretation
5. For novel actions, use CUSTOM_SKILL_CHECK with appropriate skill and difficulty
6. Include up to 3 alternatives if applicable
7. Provide a brief rationale for your choice

CONTEXT USAGE:
- location.exits: Available directions for MOVE
- objects: Things that can be examined, used, or interacted with
- npcs: Characters that can be talked to
- inventory: Items the player has available
- player.skills: Available skills for skill checks

EXAMPLES:
Input: "go north"
Output: {"primary":{"type":"MOVE","direction":"north"},"rationale":"Clear movement command"}

Input: "examine the ancient tome"
Output: {"primary":{"type":"LOOK","target":"ancient-tome"},"rationale":"Player wants to examine an object"}

Input: "climb the wall using my rope"
Output: {"primary":{"type":"CUSTOM_SKILL_CHECK","description":"climb the wall using rope","skill":"athletics","difficulty":"normal","impliedPrimitive":"MOVE"},"alternates":["use rope on wall","search for handholds"],"rationale":"Creative movement requiring skill check"}`;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly ollamaService: OllamaService,
  ) {}

  async interpret(request: InterpreterRequest): Promise<InterpreterResponse> {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!request.text?.trim()) {
        throw new BadRequestException('Text input is required');
      }

      // Check for simple command patterns first (fast path)
      const fastPathResult = this.tryFastPath(request.text, request.context);
      if (fastPathResult) {
        return {
          actionPlan: fastPathResult,
          processingTime: Date.now() - startTime,
          cached: false,
        };
      }

      // Check cache
      const cacheKey = this.generateCacheKey(request);
      const cached = await this.cacheManager.get<ActionPlan>(cacheKey);
      
      if (cached) {
        this.logger.debug(`Cache hit for input: ${request.text}`);
        return {
          actionPlan: cached,
          processingTime: Date.now() - startTime,
          cached: true,
        };
      }

      // Generate with Ollama
      const actionPlan = await this.generateActionPlan(request);

      // Cache the result
      await this.cacheManager.set(cacheKey, actionPlan, 3600000); // 1 hour TTL

      return {
        actionPlan,
        processingTime: Date.now() - startTime,
        model: 'ollama',
        cached: false,
      };
    } catch (error) {
      this.logger.error(`Interpretation failed: ${error.message}`);
      
      // Fallback to basic parsing
      const fallbackPlan = this.fallbackParse(request.text);
      
      return {
        actionPlan: fallbackPlan,
        processingTime: Date.now() - startTime,
        cached: false,
      };
    }
  }

  private tryFastPath(text: string, context: ContextPacket): ActionPlan | null {
    const normalized = text.toLowerCase().trim();

    // Movement commands
    const movePatterns = [
      { pattern: /^(go |move |walk )?(north|n)$/i, direction: 'north' },
      { pattern: /^(go |move |walk )?(south|s)$/i, direction: 'south' },
      { pattern: /^(go |move |walk )?(east|e)$/i, direction: 'east' },
      { pattern: /^(go |move |walk )?(west|w)$/i, direction: 'west' },
      { pattern: /^(go |move |walk )?(up|u)$/i, direction: 'up' },
      { pattern: /^(go |move |walk )?(down|d)$/i, direction: 'down' },
    ];

    for (const { pattern, direction } of movePatterns) {
      if (pattern.test(normalized)) {
        // Verify direction is available
        const hasExit = context.location.exits.some(exit => 
          exit.direction.toLowerCase() === direction
        );
        
        if (hasExit) {
          return {
            primary: { type: 'MOVE', direction: direction as any },
            rationale: `Fast path: movement ${direction}`,
          };
        }
      }
    }

    // Basic commands
    if (/^(look|l)$/i.test(normalized)) {
      return {
        primary: { type: 'LOOK' },
        rationale: 'Fast path: basic look command',
      };
    }

    if (/^(inventory|inv|i)$/i.test(normalized)) {
      return {
        primary: { type: 'LOOK', target: 'inventory' },
        rationale: 'Fast path: inventory check',
      };
    }

    return null;
  }

  private async generateActionPlan(request: InterpreterRequest): Promise<ActionPlan> {
    // Build context prompt
    const contextPrompt = this.buildContextPrompt(request.context);
    
    // Build user prompt
    const userPrompt = `CONTEXT:
${contextPrompt}

PLAYER INPUT: "${request.text}"

Generate ActionPlan JSON:`;

    try {
      const response = await this.ollamaService.generate({
        system: this.SYSTEM_PROMPT,
        prompt: userPrompt,
        format: 'json',
        options: {
          temperature: 0,
          num_predict: 512,
        },
      });

      // Parse and validate the response
      const parsed = JSON.parse(response.response);
      const actionPlan = ActionPlanSchema.parse(parsed);
      
      this.logger.debug(`Generated action plan: ${JSON.stringify(actionPlan)}`);
      return actionPlan;
      
    } catch (error) {
      this.logger.error(`Failed to generate action plan: ${error.message}`);
      throw new ServiceUnavailableException('AI interpretation service unavailable');
    }
  }

  private buildContextPrompt(context: ContextPacket): string {
    const parts = [];

    // Location info
    parts.push(`LOCATION: ${context.location.name} (${context.location.biome})`);
    parts.push(`DESCRIPTION: ${context.location.description}`);
    
    if (context.location.exits.length > 0) {
      const exits = context.location.exits.map(e => e.direction).join(', ');
      parts.push(`EXITS: ${exits}`);
    }

    // Objects
    if (context.objects.length > 0) {
      const objects = context.objects.map(o => `${o.name} (${o.id})`).join(', ');
      parts.push(`OBJECTS: ${objects}`);
    }

    // NPCs
    if (context.npcs.length > 0) {
      const npcs = context.npcs.map(n => `${n.name} (${n.disposition})`).join(', ');
      parts.push(`NPCS: ${npcs}`);
    }

    // Inventory
    if (context.inventory.length > 0) {
      const items = context.inventory.map(i => `${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ''}`).join(', ');
      parts.push(`INVENTORY: ${items}`);
    }

    // Player info
    parts.push(`PLAYER LEVEL: ${context.player.level}`);
    parts.push(`HEALTH: ${context.player.health.current}/${context.player.health.max}`);
    
    if (context.player.skills.length > 0) {
      parts.push(`SKILLS: ${context.player.skills.join(', ')}`);
    }

    return parts.join('\n');
  }

  private fallbackParse(text: string): ActionPlan {
    const normalized = text.toLowerCase().trim();

    // Try to extract basic intent
    if (normalized.includes('look') || normalized.includes('examine')) {
      return {
        primary: { type: 'LOOK' },
        rationale: 'Fallback: detected look intent',
      };
    }

    if (normalized.includes('talk') || normalized.includes('speak')) {
      return {
        primary: { type: 'CUSTOM_SKILL_CHECK', description: text, skill: 'persuasion', difficulty: 'normal' },
        rationale: 'Fallback: detected talk intent',
      };
    }

    if (normalized.includes('attack') || normalized.includes('fight')) {
      return {
        primary: { type: 'CUSTOM_SKILL_CHECK', description: text, difficulty: 'normal' },
        rationale: 'Fallback: detected combat intent',
      };
    }

    // Default to custom skill check
    return {
      primary: {
        type: 'CUSTOM_SKILL_CHECK',
        description: text,
        difficulty: 'normal',
      },
      rationale: 'Fallback: general skill check',
    };
  }

  private generateCacheKey(request: InterpreterRequest): string {
    // Create hash from text and relevant context
    const contextHash = createHash('md5')
      .update(JSON.stringify({
        text: request.text.toLowerCase().trim(),
        location: request.context.location.id,
        objects: request.context.objects.map(o => o.id).sort(),
        npcs: request.context.npcs.map(n => n.id).sort(),
        inventory: request.context.inventory.map(i => i.id).sort(),
      }))
      .digest('hex');
    
    return `interpreter:${contextHash}`;
  }
}
