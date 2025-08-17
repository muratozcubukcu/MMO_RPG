import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  NarrativeRequest,
  NarrativeResponse,
  NarrativeRequestSchema,
  ContextPacket,
  GameEvent,
} from '@ai-mmo/shared-types';
import { OllamaService } from './ollama.service';
import { createHash } from 'crypto';

@Injectable()
export class NarratorService {
  private readonly logger = new Logger(NarratorService.name);

  // System prompt for the narrator
  private readonly SYSTEM_PROMPT = `You are an immersive fantasy RPG narrator. Your job is to turn game outcomes into vivid, engaging narrative descriptions.

RULES:
1. Output ONLY valid JSON with "text" and "suggestions" fields
2. Write in second person ("You...")
3. Create 1-3 sentences of vivid, atmospheric description
4. Suggest 2 logical next actions based on the situation
5. Match the world's tone and setting
6. Don't introduce new mechanics or items beyond the outcome
7. Keep descriptions concise but evocative
8. Focus on sensory details and emotions

TONE GUIDELINES:
- Heroic: Epic, inspiring, noble language
- Grim: Dark, serious, foreboding atmosphere
- Whimsical: Playful, magical, lighthearted tone
- Dark: Mysterious, ominous, shadowy descriptions

OUTPUT FORMAT:
{
  "text": "Your vivid narrative description here...",
  "suggestions": ["First suggested action", "Second suggested action"]
}

EXAMPLES:
Combat Victory: "Your blade finds its mark with a satisfying thud, and the orc crumples to the ground with a final growl. Victory surges through your veins as you stand triumphant over your fallen foe."

Movement: "You push through the dense undergrowth and emerge into a moonlit clearing. Ancient stone pillars rise from the earth like sleeping giants, their surfaces carved with mysterious runes that seem to pulse with inner light."

Skill Success: "With careful precision, you weave the rope around the gnarled branch and test its strength. The knot holds firm, and you feel confident in your makeshift climbing aid."`;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly ollamaService: OllamaService,
  ) {}

  async generateNarrative(request: NarrativeRequest): Promise<NarrativeResponse> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedRequest = NarrativeRequestSchema.parse(request);

      // Check cache first
      const cacheKey = this.generateCacheKey(validatedRequest);
      const cached = await this.cacheManager.get<{ text: string; suggestions: string[] }>(cacheKey);
      
      if (cached) {
        this.logger.debug(`Cache hit for narrative`);
        return {
          text: cached.text,
          suggestions: cached.suggestions,
          processingTime: Date.now() - startTime,
          cached: true,
        };
      }

      // Try template-based narrative first (faster)
      const templateResult = this.tryTemplateNarrative(validatedRequest);
      if (templateResult) {
        return {
          ...templateResult,
          processingTime: Date.now() - startTime,
          cached: false,
        };
      }

      // Generate with AI
      const narrative = await this.generateWithAI(validatedRequest);

      // Cache the result
      await this.cacheManager.set(cacheKey, { 
        text: narrative.text, 
        suggestions: narrative.suggestions 
      }, 600000); // 10 minutes TTL

      return {
        ...narrative,
        processingTime: Date.now() - startTime,
        model: 'ollama',
        cached: false,
      };
    } catch (error) {
      this.logger.error(`Narrative generation failed: ${error.message}`);
      
      // Fallback to template
      const fallback = this.fallbackNarrative(request);
      
      return {
        ...fallback,
        processingTime: Date.now() - startTime,
        cached: false,
      };
    }
  }

  private tryTemplateNarrative(request: NarrativeRequest): { text: string; suggestions: string[] } | null {
    const { outcome, context, action } = request;

    // Movement template
    if (action?.type === 'MOVE' && outcome.success) {
      const location = context.location;
      const templates = [
        `You ${action.direction ? `head ${action.direction}` : 'move forward'} and find yourself in ${location.name}. ${location.description}`,
        `Your footsteps echo as you ${action.direction ? `travel ${action.direction}` : 'proceed'} to ${location.name}. ${location.description}`,
        `The path ${action.direction ? action.direction : 'ahead'} leads you to ${location.name}. ${location.description}`,
      ];
      
      const text = templates[Math.floor(Math.random() * templates.length)];
      const suggestions = this.generateLocationSuggestions(context);
      
      return { text, suggestions };
    }

    // Combat template
    if (action?.type === 'ATTACK' && outcome.success) {
      const combatEvent = outcome.events.find(e => e.type === 'COMBAT_RESOLVED');
      if (combatEvent) {
        const templates = [
          `Your weapon strikes true! The battle is fierce but brief, and you emerge victorious with hard-earned experience.`,
          `Steel clashes against steel in a deadly dance, but your skill prevails. Your fallen foe yields valuable experience.`,
          `The fight tests your mettle, but determination and skill see you through to victory.`,
        ];
        
        const text = templates[Math.floor(Math.random() * templates.length)];
        const suggestions = ['Look around for loot', 'Continue exploring'];
        
        return { text, suggestions };
      }
    }

    // Look template
    if (action?.type === 'LOOK') {
      const location = context.location;
      const text = `You survey your surroundings carefully. ${location.description}${context.objects.length > 0 ? ` You notice: ${context.objects.map(o => o.name).join(', ')}.` : ''}`;
      const suggestions = this.generateLocationSuggestions(context);
      
      return { text, suggestions };
    }

    return null;
  }

  private async generateWithAI(request: NarrativeRequest): Promise<{ text: string; suggestions: string[] }> {
    // Build context prompt
    const contextPrompt = this.buildContextPrompt(request);
    
    // Build user prompt
    const userPrompt = `CONTEXT:
${contextPrompt}

ACTION: ${request.action?.type || 'Unknown'}
OUTCOME: ${request.outcome.success ? 'Success' : 'Failure'}
EVENTS: ${request.outcome.events.map(e => e.type).join(', ')}
MESSAGE: ${request.outcome.message || 'No message'}

Generate immersive narrative JSON:`;

    try {
      const response = await this.ollamaService.generate({
        system: this.SYSTEM_PROMPT,
        prompt: userPrompt,
        format: 'json',
        options: {
          temperature: 0.8,
          num_predict: 300,
        },
      });

      // Parse and validate the response
      const parsed = JSON.parse(response.response);
      
      if (!parsed.text || !Array.isArray(parsed.suggestions)) {
        throw new Error('Invalid AI response format');
      }
      
      return {
        text: parsed.text,
        suggestions: parsed.suggestions.slice(0, 2), // Max 2 suggestions
      };
      
    } catch (error) {
      this.logger.error(`Failed to generate AI narrative: ${error.message}`);
      throw new ServiceUnavailableException('AI narrative service unavailable');
    }
  }

  private buildContextPrompt(request: NarrativeRequest): string {
    const { context, action, outcome } = request;
    const parts = [];

    // Location info
    parts.push(`LOCATION: ${context.location.name} (${context.location.biome})`);
    parts.push(`DESCRIPTION: ${context.location.description}`);
    
    // Available exits
    if (context.location.exits.length > 0) {
      const exits = context.location.exits.map(e => e.direction).join(', ');
      parts.push(`EXITS: ${exits}`);
    }

    // Objects and NPCs
    if (context.objects.length > 0) {
      parts.push(`OBJECTS: ${context.objects.map(o => o.name).join(', ')}`);
    }
    
    if (context.npcs.length > 0) {
      parts.push(`NPCS: ${context.npcs.map(n => n.name).join(', ')}`);
    }

    // Player state
    parts.push(`PLAYER LEVEL: ${context.player.level}`);
    parts.push(`HEALTH: ${context.player.health.current}/${context.player.health.max}`);

    // World tone
    if (request.tone) {
      parts.push(`WORLD TONE: ${request.tone}`);
    }

    return parts.join('\n');
  }

  private generateLocationSuggestions(context: ContextPacket): string[] {
    const suggestions: string[] = [];
    
    // Movement suggestions
    if (context.location.exits.length > 0) {
      const randomExit = context.location.exits[Math.floor(Math.random() * context.location.exits.length)];
      suggestions.push(`Go ${randomExit.direction}`);
    }
    
    // Object interactions
    if (context.objects.length > 0) {
      const randomObject = context.objects[Math.floor(Math.random() * context.objects.length)];
      suggestions.push(`Examine the ${randomObject.name}`);
    }
    
    // NPC interactions
    if (context.npcs.length > 0) {
      const randomNPC = context.npcs[Math.floor(Math.random() * context.npcs.length)];
      suggestions.push(`Talk to ${randomNPC.name}`);
    }
    
    // Default suggestions
    if (suggestions.length === 0) {
      suggestions.push('Look around', 'Check inventory');
    } else if (suggestions.length === 1) {
      suggestions.push('Look around');
    }
    
    return suggestions.slice(0, 2);
  }

  private fallbackNarrative(request: NarrativeRequest): { text: string; suggestions: string[] } {
    const { outcome, context } = request;
    
    let text = outcome.message || 'Something happens in the world around you.';
    
    // Add some atmospheric touch
    if (outcome.success) {
      text += ' You feel a sense of accomplishment.';
    } else {
      text += ' Perhaps another approach would work better.';
    }

    const suggestions = this.generateLocationSuggestions(context);
    
    return { text, suggestions };
  }

  private generateCacheKey(request: NarrativeRequest): string {
    // Create hash from action, outcome, and relevant context
    const cacheData = {
      action: request.action?.type,
      success: request.outcome.success,
      events: request.outcome.events.map(e => e.type).sort(),
      location: request.context.location.id,
      message: request.outcome.message,
    };
    
    const hash = createHash('md5')
      .update(JSON.stringify(cacheData))
      .digest('hex');
    
    return `narrative:${hash}`;
  }
}
