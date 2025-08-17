import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import {
  WorldPromptInput,
  WorldPromptInputSchema,
  WorldGenJob,
} from '@ai-mmo/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WorldGenService {
  private readonly logger = new Logger(WorldGenService.name);

  constructor(
    @InjectQueue('worldgen') private worldgenQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async createWorld(
    userId: string,
    input: WorldPromptInput,
  ): Promise<{ worldId: string; jobId: string }> {
    // Validate input
    const validatedInput = WorldPromptInputSchema.parse(input);

    // Create world record
    const world = await this.prisma.world.create({
      data: {
        ownerId: userId,
        title: validatedInput.title || 'Untitled World',
        description: validatedInput.prompt,
        seed: uuidv4(),
        status: 'GENERATING',
        modelVersion: 'llama3:8b-instruct',
      },
    });

    // Create generation job
    const genJob = await this.prisma.worldGenJob.create({
      data: {
        worldId: world.id,
        userId,
        prompt: validatedInput.prompt,
        status: 'QUEUED',
      },
    });

    // Queue the generation job
    const job = await this.worldgenQueue.add('generate-world', {
      worldId: world.id,
      jobId: genJob.id,
      userId,
      prompt: validatedInput.prompt,
      tone: validatedInput.tone,
    });

    this.logger.log(`Queued world generation job ${genJob.id} for world ${world.id}`);

    return {
      worldId: world.id,
      jobId: genJob.id,
    };
  }

  async getWorldGenJob(jobId: string): Promise<WorldGenJob | null> {
    return this.prisma.worldGenJob.findUnique({
      where: { id: jobId },
    });
  }

  async getWorldGenJobs(userId: string): Promise<WorldGenJob[]> {
    return this.prisma.worldGenJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getWorld(worldId: string) {
    return this.prisma.world.findUnique({
      where: { id: worldId },
      include: {
        owner: {
          select: { username: true },
        },
      },
    });
  }

  async getWorlds(userId?: string, limit: number = 20, offset: number = 0) {
    const where = userId ? { ownerId: userId } : { status: 'READY' };

    return this.prisma.world.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        owner: {
          select: { username: true },
        },
        _count: {
          select: {
            locations: true,
            quests: true,
          },
        },
      },
    });
  }
}
