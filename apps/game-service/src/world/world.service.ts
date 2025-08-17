import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorldService {
  constructor(private readonly prisma: PrismaService) {}

  async findWorld(id: string) {
    return this.prisma.world.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        locations: {
          take: 20, // Limit for GraphQL performance
        },
        quests: {
          take: 20,
        },
      },
    });
  }

  async findWorlds(take: number = 20, skip: number = 0) {
    return this.prisma.world.findMany({
      where: {
        status: 'READY',
      },
      take,
      skip,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        owner: {
          select: {
            username: true,
          },
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

  async findPlayerState(userId: string, worldId: string) {
    return this.prisma.playerState.findUnique({
      where: {
        userId_worldId: {
          userId,
          worldId,
        },
      },
    });
  }
}
