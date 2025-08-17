import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlayerService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlayerState(userId: string, worldId: string) {
    return this.prisma.playerState.findUnique({
      where: {
        userId_worldId: {
          userId,
          worldId,
        },
      },
    });
  }

  async createPlayerState(userId: string, worldId: string) {
    // Get the world to find starting location
    const world = await this.prisma.world.findUnique({
      where: { id: worldId },
      include: {
        locations: {
          take: 1, // Get first location as starting point
        },
      },
    });

    if (!world || world.locations.length === 0) {
      throw new Error('World has no locations');
    }

    const startingLocation = world.locations[0];

    // Create player state
    return this.prisma.playerState.create({
      data: {
        userId,
        worldId,
        currentLocationKey: startingLocation.key,
        level: 1,
        experience: 0,
        statsJson: {
          strength: 10,
          dexterity: 10,
          intelligence: 10,
          vitality: 10,
          wisdom: 10,
          charisma: 10,
          luck: 5,
        },
        healthJson: {
          current: 100,
          max: 100,
        },
        manaJson: {
          current: 50,
          max: 50,
        },
        gold: 100,
        activeQuestsJson: [],
        completedQuestsJson: [],
      },
    });
  }

  async updatePlayerState(
    userId: string,
    worldId: string,
    updates: Partial<{
      currentLocationKey: string;
      level: number;
      experience: number;
      statsJson: any;
      healthJson: any;
      manaJson: any;
      gold: number;
      activeQuestsJson: any[];
      completedQuestsJson: string[];
      cooldownsJson: any;
      statusEffectsJson: any[];
    }>,
  ) {
    return this.prisma.playerState.update({
      where: {
        userId_worldId: {
          userId,
          worldId,
        },
      },
      data: updates,
    });
  }

  async addExperience(userId: string, worldId: string, amount: number) {
    const playerState = await this.getPlayerState(userId, worldId);
    if (!playerState) {
      throw new Error('Player state not found');
    }

    const newExperience = playerState.experience + amount;
    
    // Simple level calculation (can be enhanced with rules engine)
    const newLevel = Math.floor(Math.sqrt(newExperience / 100)) + 1;
    const leveledUp = newLevel > playerState.level;

    const updates: any = {
      experience: newExperience,
    };

    if (leveledUp) {
      updates.level = newLevel;
      
      // Increase health and mana on level up
      const healthJson = playerState.healthJson as any;
      const manaJson = playerState.manaJson as any;
      
      updates.healthJson = {
        current: healthJson.max + 10, // Full heal on level up
        max: healthJson.max + 10,
      };
      
      if (manaJson) {
        updates.manaJson = {
          current: manaJson.max + 5,
          max: manaJson.max + 5,
        };
      }
    }

    await this.updatePlayerState(userId, worldId, updates);

    return {
      experienceGained: amount,
      newLevel: updates.level || playerState.level,
      leveledUp,
    };
  }

  async healPlayer(userId: string, worldId: string, amount: number) {
    const playerState = await this.getPlayerState(userId, worldId);
    if (!playerState) {
      throw new Error('Player state not found');
    }

    const healthJson = playerState.healthJson as any;
    const newHealth = Math.min(healthJson.current + amount, healthJson.max);

    await this.updatePlayerState(userId, worldId, {
      healthJson: {
        current: newHealth,
        max: healthJson.max,
      },
    });

    return {
      healingDone: newHealth - healthJson.current,
      newHealth,
    };
  }

  async damagePlayer(userId: string, worldId: string, amount: number) {
    const playerState = await this.getPlayerState(userId, worldId);
    if (!playerState) {
      throw new Error('Player state not found');
    }

    const healthJson = playerState.healthJson as any;
    const newHealth = Math.max(0, healthJson.current - amount);

    await this.updatePlayerState(userId, worldId, {
      healthJson: {
        current: newHealth,
        max: healthJson.max,
      },
    });

    return {
      damageTaken: healthJson.current - newHealth,
      newHealth,
      died: newHealth === 0,
    };
  }

  async movePlayer(userId: string, worldId: string, newLocationKey: string) {
    // Validate the location exists
    const location = await this.prisma.location.findFirst({
      where: {
        worldId,
        key: newLocationKey,
      },
    });

    if (!location) {
      throw new Error('Location not found');
    }

    await this.updatePlayerState(userId, worldId, {
      currentLocationKey: newLocationKey,
    });

    return location;
  }
}
