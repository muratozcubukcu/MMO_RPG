import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlayerService } from './player.service';
import { CommandProcessor } from './command-processor.service';
import { EventEmitter } from './event-emitter.service';
import {
  CommandRequest,
  FreeformCommandRequest,
  CommandOutcome,
  GameCommand,
  ContextPacket,
} from '@ai-mmo/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly playerService: PlayerService,
    private readonly commandProcessor: CommandProcessor,
    private readonly eventEmitter: EventEmitter,
  ) {}

  async executeCommand(
    worldId: string,
    userId: string,
    request: CommandRequest | FreeformCommandRequest,
  ): Promise<CommandOutcome> {
    // Check if action already processed (idempotency)
    const existingAction = await this.prisma.action.findUnique({
      where: { idempotencyKey: request.idempotencyKey },
    });

    if (existingAction && existingAction.outcomeJson) {
      return existingAction.outcomeJson as CommandOutcome;
    }

    // Validate world access
    const world = await this.prisma.world.findUnique({
      where: { id: worldId },
    });

    if (!world || world.status !== 'READY') {
      throw new NotFoundException('World not found or not ready');
    }

    // Get or create player state
    let playerState = await this.playerService.getPlayerState(userId, worldId);
    if (!playerState) {
      playerState = await this.playerService.createPlayerState(userId, worldId);
    }

    let command: GameCommand;
    let processingNotes: string[] = [];

    // Handle freeform vs structured commands
    if ('text' in request) {
      // Freeform command - needs interpretation
      const contextPacket = await this.buildContextPacket(worldId, playerState);
      const interpretedCommand = await this.commandProcessor.interpretCommand(
        request.text,
        contextPacket,
      );
      command = interpretedCommand.primary;
      processingNotes.push(`Interpreted: "${request.text}" → ${command.type}`);
    } else {
      // Structured command
      command = request.command;
    }

    // Process the command
    const outcome = await this.commandProcessor.processCommand(
      command,
      worldId,
      userId,
      playerState,
    );

    // Add processing notes to outcome
    if (processingNotes.length > 0) {
      outcome.message = processingNotes.join('\n') + (outcome.message ? '\n' + outcome.message : '');
    }

    // Store action record
    await this.prisma.action.upsert({
      where: { idempotencyKey: request.idempotencyKey },
      update: { outcomeJson: outcome as any },
      create: {
        worldId,
        userId,
        type: command.type,
        payloadJson: command as any,
        idempotencyKey: request.idempotencyKey,
        outcomeJson: outcome as any,
      },
    });

    // Emit events for real-time updates
    if (outcome.events.length > 0) {
      await this.eventEmitter.emitEvents(worldId, userId, outcome.events);
    }

    return outcome;
  }

  private async buildContextPacket(
    worldId: string,
    playerState: any,
  ): Promise<ContextPacket> {
    // Get current location
    const location = await this.prisma.location.findFirst({
      where: {
        worldId,
        key: playerState.currentLocationKey,
      },
    });

    if (!location) {
      throw new BadRequestException('Player location not found');
    }

    // Get player inventory
    const inventory = await this.prisma.inventory.findUnique({
      where: { userId: playerState.userId },
      include: {
        items: {
          include: {
            itemInstance: {
              include: {
                archetype: true,
              },
            },
          },
        },
      },
    });

    // Build context packet
    const contextPacket: ContextPacket = {
      worldId,
      location: {
        id: location.key,
        name: location.name,
        description: location.description,
        biome: location.biome,
        exits: (location.connectionsJson as any[]).map((conn: any) => ({
          direction: conn.direction,
          target: conn.targetKey,
          description: conn.description,
        })),
      },
      objects: [], // TODO: Add location objects
      npcs: [], // TODO: Add location NPCs
      mobs: [], // TODO: Add location mobs
      player: {
        level: playerState.level,
        health: playerState.healthJson as any,
        mana: playerState.manaJson as any,
        skills: ['athletics', 'stealth', 'persuasion', 'arcana', 'survival'], // TODO: Get from player
        activeQuests: (playerState.activeQuestsJson as any[]).map((q: any) => ({
          key: q.questKey,
          name: q.questKey, // TODO: Get quest name
          currentStep: Object.keys(q.progress)[0],
        })),
      },
      inventory: inventory?.items.map((item) => ({
        id: item.itemInstance.id,
        name: item.itemInstance.archetype.name,
        quantity: item.quantity,
        usable: item.itemInstance.archetype.slot === 'CONSUMABLE',
      })) || [],
      cooldowns: playerState.cooldownsJson as Record<string, number> || {},
    };

    return contextPacket;
  }

  async getWorldInfo(worldId: string) {
    const world = await this.prisma.world.findUnique({
      where: { id: worldId },
      include: {
        owner: {
          select: { username: true },
        },
        locations: {
          take: 10, // Limit for performance
        },
        quests: {
          take: 10,
        },
      },
    });

    if (!world) {
      throw new NotFoundException('World not found');
    }

    return {
      id: world.id,
      title: world.title,
      description: world.description,
      owner: world.owner.username,
      status: world.status,
      createdAt: world.createdAt,
      locationCount: world.locations.length,
      questCount: world.quests.length,
    };
  }

  async getPlayerState(userId: string, worldId: string) {
    return this.playerService.getPlayerState(userId, worldId);
  }
}
