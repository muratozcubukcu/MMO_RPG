import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { PlayerService } from './player.service';
import {
  GameCommand,
  CommandOutcome,
  ContextPacket,
  ActionPlan,
  InterpreterRequest,
  InterpreterResponse,
  NarrativeRequest,
  NarrativeResponse,
  GameEvent,
} from '@ai-mmo/shared-types';
import {
  performSkillCheck,
  calculateCombatRewards,
  rollInitiative,
  resolveCombatTurn,
  checkCombatEnd,
  DIFFICULTY_DCS,
} from '@ai-mmo/rules-engine';

@Injectable()
export class CommandProcessor {
  private readonly logger = new Logger(CommandProcessor.name);
  private readonly interpreterUrl: string;
  private readonly narratorUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly playerService: PlayerService,
  ) {
    this.interpreterUrl = this.configService.get<string>(
      'INTERPRETER_SERVICE_URL',
      'http://interpreter-service:3003',
    );
    this.narratorUrl = this.configService.get<string>(
      'NARRATOR_SERVICE_URL',
      'http://narrator-service:3004',
    );
  }

  async interpretCommand(text: string, context: ContextPacket): Promise<ActionPlan> {
    try {
      const request: InterpreterRequest = {
        text,
        context,
      };

      const response = await firstValueFrom(
        this.httpService.post<InterpreterResponse>(`${this.interpreterUrl}/interpret`, request),
      );

      return response.data.actionPlan;
    } catch (error) {
      this.logger.error(`Failed to interpret command: ${error.message}`);
      
      // Fallback to basic interpretation
      return {
        primary: {
          type: 'CUSTOM_SKILL_CHECK',
          description: text,
          difficulty: 'normal',
        },
        rationale: 'Fallback interpretation due to service error',
      };
    }
  }

  async processCommand(
    command: GameCommand,
    worldId: string,
    userId: string,
    playerState: any,
  ): Promise<CommandOutcome> {
    const events: GameEvent[] = [];
    let success = true;
    let message = '';

    try {
      switch (command.type) {
        case 'MOVE':
          const moveResult = await this.processMove(command, worldId, userId, playerState);
          events.push(...moveResult.events);
          message = moveResult.message;
          break;

        case 'LOOK':
          const lookResult = await this.processLook(command, worldId, userId, playerState);
          message = lookResult.message;
          break;

        case 'TALK':
          const talkResult = await this.processTalk(command, worldId, userId, playerState);
          message = talkResult.message;
          break;

        case 'USE':
          const useResult = await this.processUse(command, worldId, userId, playerState);
          events.push(...useResult.events);
          message = useResult.message;
          break;

        case 'ATTACK':
          const attackResult = await this.processAttack(command, worldId, userId, playerState);
          events.push(...attackResult.events);
          message = attackResult.message;
          break;

        case 'CUSTOM_SKILL_CHECK':
          const skillResult = await this.processSkillCheck(command, worldId, userId, playerState);
          events.push(...skillResult.events);
          message = skillResult.message;
          break;

        default:
          success = false;
          message = `Unknown command type: ${(command as any).type}`;
      }
    } catch (error) {
      this.logger.error(`Command processing error: ${error.message}`);
      success = false;
      message = `Command failed: ${error.message}`;
    }

    // Generate narrative if we have a successful action
    let narrative;
    if (success && command.type !== 'LOOK') { // Skip narrative for simple look commands
      try {
        // Build a simple context for narrative generation
        const location = await this.prisma.location.findFirst({
          where: { worldId, key: playerState.currentLocationKey },
        });
        
        if (location) {
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
                description: conn.description || '',
              })),
            },
            objects: [],
            npcs: [],
            mobs: [],
            player: {
              level: playerState.level,
              health: playerState.healthJson as any,
              mana: playerState.manaJson as any,
              skills: ['athletics', 'stealth', 'persuasion', 'arcana', 'survival'],
              activeQuests: [],
            },
            inventory: [],
            cooldowns: playerState.cooldownsJson as Record<string, number> || {},
          };
          
          narrative = await this.generateNarrative(command, { success, events, message }, contextPacket);
        }
      } catch (error) {
        this.logger.warn(`Failed to generate narrative: ${error.message}`);
      }
    }

    return {
      success,
      events,
      message,
      narrative,
      stateHash: this.generateStateHash(playerState),
    };
  }



  private async generateNarrative(
    command: GameCommand,
    outcome: { success: boolean; events: GameEvent[]; message?: string },
    context: ContextPacket,
  ): Promise<{ text: string; suggestions: string[] }> {
    try {
      const request: NarrativeRequest = {
        outcome,
        context,
        action: command,
        tone: 'heroic', // TODO: Get from world settings
      };

      const response = await firstValueFrom(
        this.httpService.post<NarrativeResponse>(`${this.narratorUrl}/narrate`, request),
      );

      return {
        text: response.data.text,
        suggestions: response.data.suggestions,
      };
    } catch (error) {
      this.logger.error(`Failed to generate narrative: ${error.message}`);
      
      // Fallback to basic message
      return {
        text: outcome.message || 'Something happens.',
        suggestions: ['Look around', 'Continue exploring'],
      };
    }
  }

  private async processMove(
    command: any,
    worldId: string,
    userId: string,
    playerState: any,
  ): Promise<{ events: GameEvent[]; message: string }> {
    const currentLocation = await this.prisma.location.findFirst({
      where: {
        worldId,
        key: playerState.currentLocationKey,
      },
    });

    if (!currentLocation) {
      throw new Error('Current location not found');
    }

    const connections = currentLocation.connectionsJson as any[];
    let targetLocationKey: string | undefined;

    // Find target location
    if (command.direction) {
      const connection = connections.find(c => c.direction === command.direction);
      targetLocationKey = connection?.targetKey;
    } else if (command.target) {
      // Try to find by target name
      const connection = connections.find(c => 
        c.targetKey.includes(command.target) || 
        c.description?.toLowerCase().includes(command.target.toLowerCase())
      );
      targetLocationKey = connection?.targetKey;
    }

    if (!targetLocationKey) {
      return {
        events: [],
        message: `You cannot go that way. Available exits: ${connections.map(c => c.direction).join(', ')}`,
      };
    }

    // Move the player
    const newLocation = await this.playerService.movePlayer(userId, worldId, targetLocationKey);

    const events: GameEvent[] = [{
      type: 'STATE_UPDATED',
      playerId: userId,
      changes: {
        location: targetLocationKey,
      },
    }];

    return {
      events,
      message: `You move ${command.direction || 'to ' + newLocation.name}. ${newLocation.description}`,
    };
  }

  private async processLook(
    command: any,
    worldId: string,
    userId: string,
    playerState: any,
  ): Promise<{ message: string }> {
    if (command.target === 'inventory') {
      const inventory = await this.prisma.inventory.findUnique({
        where: { userId },
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

      if (!inventory || inventory.items.length === 0) {
        return { message: 'Your inventory is empty.' };
      }

      const itemList = inventory.items.map(item => 
        `${item.itemInstance.archetype.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}${item.equipped ? ' (equipped)' : ''}`
      ).join(', ');

      return { message: `Inventory: ${itemList}` };
    }

    // Look at current location
    const location = await this.prisma.location.findFirst({
      where: {
        worldId,
        key: playerState.currentLocationKey,
      },
    });

    if (!location) {
      return { message: 'You find yourself in a strange, undefined place.' };
    }

    const connections = location.connectionsJson as any[];
    const exits = connections.map(c => c.direction).join(', ');

    return {
      message: `${location.description}\n\nExits: ${exits}`,
    };
  }

  private async processTalk(
    command: any,
    worldId: string,
    userId: string,
    playerState: any,
  ): Promise<{ message: string }> {
    // Simple NPC interaction - could be enhanced with AI
    const npcResponses = [
      "The NPC nods knowingly and says, 'Greetings, traveler. These lands hold many secrets.'",
      "'I've seen many adventurers pass through here. Each seeks something different.'",
      "'Be careful on your journey. The paths ahead are treacherous but rewarding.'",
      "'Have you heard the legends of the ancient artifacts hidden in these realms?'",
    ];

    const randomResponse = npcResponses[Math.floor(Math.random() * npcResponses.length)];
    
    return {
      message: `You speak with ${command.target}. ${randomResponse}`,
    };
  }

  private async processUse(
    command: any,
    worldId: string,
    userId: string,
    playerState: any,
  ): Promise<{ events: GameEvent[]; message: string }> {
    // Find the item in inventory
    const inventoryItem = await this.prisma.inventoryItem.findFirst({
      where: {
        inventory: { userId },
        itemInstanceId: command.itemId,
      },
      include: {
        itemInstance: {
          include: {
            archetype: true,
          },
        },
      },
    });

    if (!inventoryItem) {
      return {
        events: [],
        message: 'You do not have that item.',
      };
    }

    const archetype = inventoryItem.itemInstance.archetype;
    const events: GameEvent[] = [];

    // Handle consumables
    if (archetype.slot === 'CONSUMABLE') {
      const usableData = archetype.usableJson as any;
      
      if (usableData?.effects) {
        for (const effect of usableData.effects) {
          if (effect.type === 'heal') {
            const healResult = await this.playerService.healPlayer(userId, worldId, effect.value);
            events.push({
              type: 'STATE_UPDATED',
              playerId: userId,
              changes: {
                health: healResult.newHealth,
              },
            });
          }
        }
      }

      // Consume the item
      if (inventoryItem.quantity > 1) {
        await this.prisma.inventoryItem.update({
          where: {
            inventoryId_itemInstanceId: {
              inventoryId: inventoryItem.inventoryId,
              itemInstanceId: inventoryItem.itemInstanceId,
            },
          },
          data: {
            quantity: inventoryItem.quantity - 1,
          },
        });
      } else {
        await this.prisma.inventoryItem.delete({
          where: {
            inventoryId_itemInstanceId: {
              inventoryId: inventoryItem.inventoryId,
              itemInstanceId: inventoryItem.itemInstanceId,
            },
          },
        });
      }

      return {
        events,
        message: `You use the ${archetype.name}. ${archetype.description}`,
      };
    }

    return {
      events: [],
      message: `You cannot use the ${archetype.name} in this way.`,
    };
  }

  private async processAttack(
    command: any,
    worldId: string,
    userId: string,
    playerState: any,
  ): Promise<{ events: GameEvent[]; message: string }> {
    // Simple combat simulation - could be enhanced with full combat system
    const damage = Math.floor(Math.random() * 20) + 5;
    const playerDamage = Math.floor(Math.random() * 10) + 1;

    // Simulate taking some damage
    await this.playerService.damagePlayer(userId, worldId, playerDamage);

    // Award experience
    const expResult = await this.playerService.addExperience(userId, worldId, 50);

    const events: GameEvent[] = [
      {
        type: 'COMBAT_RESOLVED',
        encounterId: `combat_${Date.now()}`,
        participants: [
          { id: userId, type: 'player', name: 'You' },
          { id: command.target, type: 'mob', name: command.target },
        ],
        turns: [
          {
            actor: userId,
            action: 'attack',
            target: command.target,
            damage,
          },
        ],
        outcome: 'victory',
        rewards: {
          experience: 50,
          gold: 0,
        },
      },
    ];

    if (expResult.leveledUp) {
      events.push({
        type: 'STATE_UPDATED',
        playerId: userId,
        changes: {
          level: expResult.newLevel,
        },
      });
    }

    return {
      events,
      message: `You attack ${command.target} for ${damage} damage! You take ${playerDamage} damage in return. You gain 50 experience.${expResult.leveledUp ? ` You reached level ${expResult.newLevel}!` : ''}`,
    };
  }

  private async processSkillCheck(
    command: any,
    worldId: string,
    userId: string,
    playerState: any,
  ): Promise<{ events: GameEvent[]; message: string }> {
    const statsJson = playerState.statsJson as any;
    const skill = command.skill || 'athletics';
    const difficulty = command.difficulty || 'normal';

    const skillResult = performSkillCheck(
      { skill, difficulty },
      statsJson,
      playerState.level,
      [], // No proficiencies for now
      worldId,
      userId,
    );

    const events: GameEvent[] = [];
    let message = `${command.description}\n${skillResult.description}`;

    // Handle success/failure consequences
    if (skillResult.success) {
      // Award small amount of experience for successful skill checks
      const expResult = await this.playerService.addExperience(userId, worldId, 10);
      
      if (expResult.leveledUp) {
        events.push({
          type: 'STATE_UPDATED',
          playerId: userId,
          changes: {
            level: expResult.newLevel,
          },
        });
        message += ` You gained 10 experience and reached level ${expResult.newLevel}!`;
      } else {
        message += ' You gained 10 experience.';
      }
    }

    return {
      events,
      message,
    };
  }

  private generateStateHash(playerState: any): string {
    // Simple hash of key player state
    const keyState = {
      location: playerState.currentLocationKey,
      level: playerState.level,
      health: playerState.healthJson,
    };
    
    return Buffer.from(JSON.stringify(keyState)).toString('base64').slice(0, 16);
  }
}
