import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { OllamaService } from './ollama.service';
import { MinioService } from './minio.service';
import {
  WorldBlueprint,
  WorldBlueprintSchema,
  CompiledWorld,
} from '@ai-mmo/shared-types';
import { createHash } from 'crypto';

interface WorldGenJobData {
  worldId: string;
  jobId: string;
  userId: string;
  prompt: string;
  tone?: string;
}

@Processor('worldgen')
export class WorldGenProcessor {
  private readonly logger = new Logger(WorldGenProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ollama: OllamaService,
    private readonly minio: MinioService,
  ) {}

  @Process('generate-world')
  async generateWorld(job: Job<WorldGenJobData>) {
    const { worldId, jobId, userId, prompt, tone } = job.data;
    
    this.logger.log(`Starting world generation for world ${worldId}`);

    try {
      // Update job status
      await this.updateJobStatus(jobId, 'GENERATING', 10);

      // Generate world blueprint with AI
      const blueprint = await this.generateWorldBlueprint(prompt, tone);
      
      await this.updateJobStatus(jobId, 'VALIDATING', 50);

      // Validate the blueprint
      const validatedBlueprint = await this.validateBlueprint(blueprint);

      await this.updateJobStatus(jobId, 'COMPILING', 70);

      // Compile the world
      const compiledWorld = await this.compileWorld(worldId, validatedBlueprint);

      // Store compiled world in MinIO
      const worldUrl = await this.storeCompiledWorld(worldId, compiledWorld);

      await this.updateJobStatus(jobId, 'COMPLETED', 90);

      // Create world content in database
      await this.createWorldContent(worldId, validatedBlueprint, worldUrl);

      // Mark world as ready
      await this.prisma.world.update({
        where: { id: worldId },
        data: { 
          status: 'READY',
          compiledWorldUrl: worldUrl,
        },
      });

      await this.updateJobStatus(jobId, 'COMPLETED', 100);

      this.logger.log(`World generation completed for world ${worldId}`);

    } catch (error) {
      this.logger.error(`World generation failed for world ${worldId}:`, error);
      
      await this.updateJobStatus(jobId, 'FAILED', undefined, error.message);
      
      await this.prisma.world.update({
        where: { id: worldId },
        data: { status: 'ERROR' },
      });

      throw error;
    }
  }

  private async generateWorldBlueprint(prompt: string, tone?: string): Promise<WorldBlueprint> {
    const systemPrompt = `You are a fantasy world generator. Create a detailed world based on the user's prompt.

REQUIREMENTS:
- Generate exactly 30+ locations with unique names and descriptions
- Create 20+ different mobs with varied levels (1-20)
- Design 10+ quests with clear objectives
- Create 20+ item archetypes across different rarities and slots
- Include 5+ loot tables for different areas
- Ensure all connections between locations are valid
- Make the world cohesive and immersive

OUTPUT FORMAT: JSON only, matching the WorldBlueprint schema.

CONTENT GUIDELINES:
- Keep content appropriate for all ages
- Avoid excessive violence or dark themes
- Focus on adventure, exploration, and discovery
- Create meaningful quest chains and character progression
- Balance challenge and accessibility

EXAMPLE STRUCTURE:
{
  "setting": {
    "title": "World Name",
    "description": "Brief world overview",
    "tone": "heroic"
  },
  "seed": "unique-seed-123",
  "locations": [...],
  "mobs": [...],
  "quests": [...],
  "itemArchetypes": [...],
  "lootTables": [...]
}`;

    const userPrompt = `Create a fantasy RPG world based on this description:

"${prompt}"

${tone ? `Tone: ${tone}` : ''}

Generate a complete world with all required elements. Make it engaging and fun to explore!`;

    const response = await this.ollama.generate({
      system: systemPrompt,
      prompt: userPrompt,
      format: 'json',
      options: {
        temperature: 0.8,
        num_predict: 4096,
      },
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      this.logger.error('Failed to parse world blueprint JSON:', error);
      throw new Error('Invalid JSON response from AI');
    }
  }

  private async validateBlueprint(blueprint: any): Promise<WorldBlueprint> {
    try {
      // Validate with Zod schema
      const validated = WorldBlueprintSchema.parse(blueprint);
      
      // Additional validation
      if (validated.locations.length < 30) {
        throw new Error(`Not enough locations: ${validated.locations.length} < 30`);
      }
      
      if (validated.mobs.length < 20) {
        throw new Error(`Not enough mobs: ${validated.mobs.length} < 20`);
      }
      
      if (validated.quests.length < 10) {
        throw new Error(`Not enough quests: ${validated.quests.length} < 10`);
      }
      
      if (validated.itemArchetypes.length < 20) {
        throw new Error(`Not enough items: ${validated.itemArchetypes.length} < 20`);
      }

      return validated;
    } catch (error) {
      this.logger.error('Blueprint validation failed:', error);
      throw new Error(`Invalid world blueprint: ${error.message}`);
    }
  }

  private async compileWorld(worldId: string, blueprint: WorldBlueprint): Promise<CompiledWorld> {
    // Generate deterministic seeds for subsystems
    const worldSeed = blueprint.seed;
    const seeds = {
      combat: createHash('md5').update(`${worldSeed}:combat`).digest('hex'),
      loot: createHash('md5').update(`${worldSeed}:loot`).digest('hex'),
      spawns: createHash('md5').update(`${worldSeed}:spawns`).digest('hex'),
      skills: createHash('md5').update(`${worldSeed}:skills`).digest('hex'),
    };

    // Build location graph (adjacency list)
    const locationGraph: Record<string, string[]> = {};
    for (const location of blueprint.locations) {
      locationGraph[location.key] = location.connections.map(c => c.targetKey);
    }

    // Build spawn tables for locations
    const spawnTables: Record<string, Array<{ mobKey: string; weight: number; level: number }>> = {};
    for (const location of blueprint.locations) {
      spawnTables[location.key] = blueprint.mobs
        .filter(mob => this.shouldMobSpawnInLocation(mob, location))
        .map(mob => ({
          mobKey: mob.key,
          weight: this.calculateSpawnWeight(mob, location),
          level: mob.level,
        }));
    }

    // Generate level curves
    const levelCurves = {
      experience: Array.from({ length: 100 }, (_, i) => Math.floor(Math.pow(i + 1, 2.2) * 100)),
      difficulty: Array.from({ length: 100 }, (_, i) => 1 + (i * 0.1)),
    };

    const compiledWorld: CompiledWorld = {
      id: worldId,
      blueprint,
      metadata: {
        version: 1,
        compilerVersion: '1.0.0',
        modelVersion: 'llama3:8b-instruct',
        promptHash: createHash('md5').update(blueprint.setting.description).digest('hex'),
        compiledAt: new Date().toISOString(),
      },
      locationGraph,
      spawnTables,
      levelCurves,
      seeds,
    };

    return compiledWorld;
  }

  private shouldMobSpawnInLocation(mob: any, location: any): boolean {
    // Simple logic - could be enhanced with more sophisticated rules
    const mobLevel = mob.level;
    const locationDanger = this.assessLocationDanger(location);
    
    return Math.abs(mobLevel - locationDanger) <= 5;
  }

  private calculateSpawnWeight(mob: any, location: any): number {
    // Base weight of 10, adjusted by level compatibility
    const mobLevel = mob.level;
    const locationDanger = this.assessLocationDanger(location);
    const levelDiff = Math.abs(mobLevel - locationDanger);
    
    return Math.max(1, 10 - levelDiff);
  }

  private assessLocationDanger(location: any): number {
    // Simple danger assessment based on biome and description
    const biome = location.biome.toLowerCase();
    const description = location.description.toLowerCase();
    
    let danger = 5; // Base danger
    
    if (biome.includes('cave') || biome.includes('dungeon')) danger += 5;
    if (biome.includes('forest') && description.includes('dark')) danger += 3;
    if (biome.includes('mountain') || biome.includes('desert')) danger += 2;
    if (description.includes('safe') || description.includes('peaceful')) danger -= 3;
    if (description.includes('dangerous') || description.includes('hostile')) danger += 4;
    
    return Math.max(1, Math.min(20, danger));
  }

  private async storeCompiledWorld(worldId: string, compiledWorld: CompiledWorld): Promise<string> {
    const objectName = `worlds/${worldId}/compiled.json`;
    const data = JSON.stringify(compiledWorld, null, 2);
    
    return this.minio.uploadObject(objectName, data);
  }

  private async createWorldContent(worldId: string, blueprint: WorldBlueprint, worldUrl: string) {
    // Create locations
    await this.prisma.location.createMany({
      data: blueprint.locations.map(location => ({
        worldId,
        key: location.key,
        name: location.name,
        description: location.description,
        biome: location.biome,
        connectionsJson: location.connections,
      })),
    });

    // Create mobs
    await this.prisma.mob.createMany({
      data: blueprint.mobs.map(mob => ({
        worldId,
        key: mob.key,
        name: mob.name,
        level: mob.level,
        statsJson: mob.stats,
        dropsJson: mob.drops,
      })),
    });

    // Create quests
    await this.prisma.quest.createMany({
      data: blueprint.quests.map(quest => ({
        worldId,
        key: quest.key,
        name: quest.name,
        summary: quest.summary,
        stepsJson: quest.steps,
        rewardsJson: quest.rewards,
      })),
    });

    // Create item archetypes (only if they don't exist globally)
    for (const item of blueprint.itemArchetypes) {
      await this.prisma.itemArchetype.upsert({
        where: { slug: item.slug },
        update: {}, // Don't update existing items
        create: {
          slug: item.slug,
          name: item.name,
          description: item.description,
          rarity: item.rarity.toUpperCase() as any,
          slot: item.slot.toUpperCase() as any,
          statsJson: item.stats,
          tagsJson: item.tags,
          value: item.value,
          stackable: item.stackable,
          maxStack: item.maxStack,
        },
      });
    }
  }

  private async updateJobStatus(
    jobId: string,
    status: any,
    progress?: number,
    error?: string,
  ) {
    await this.prisma.worldGenJob.update({
      where: { id: jobId },
      data: {
        status,
        progress,
        error,
        updatedAt: new Date(),
      },
    });
  }
}
