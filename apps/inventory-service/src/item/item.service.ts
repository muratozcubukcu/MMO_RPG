import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateItemArchetypeOptions {
  slug: string;
  name: string;
  description: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  slot: 'WEAPON' | 'HEAD' | 'CHEST' | 'LEGS' | 'FEET' | 'HANDS' | 'RING' | 'TRINKET' | 'CONSUMABLE';
  statsJson?: any;
  tagsJson?: string[];
  value?: number;
  stackable?: boolean;
  maxStack?: number;
  usableJson?: any;
}

@Injectable()
export class ItemService {
  constructor(private readonly prisma: PrismaService) {}

  async getItemArchetypes(filters?: {
    rarity?: string;
    slot?: string;
    tags?: string[];
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const {
      rarity,
      slot,
      tags,
      search,
      limit = 50,
      offset = 0,
    } = filters || {};

    const where: any = {};

    if (rarity) {
      where.rarity = rarity.toUpperCase();
    }

    if (slot) {
      where.slot = slot.toUpperCase();
    }

    if (tags && tags.length > 0) {
      where.tagsJson = {
        hasEvery: tags,
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.itemArchetype.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' },
      }),
      this.prisma.itemArchetype.count({ where }),
    ]);

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  async getItemArchetype(id: string) {
    const item = await this.prisma.itemArchetype.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Item archetype not found');
    }

    return item;
  }

  async getItemArchetypeBySlug(slug: string) {
    const item = await this.prisma.itemArchetype.findUnique({
      where: { slug },
    });

    if (!item) {
      throw new NotFoundException('Item archetype not found');
    }

    return item;
  }

  async createItemArchetype(options: CreateItemArchetypeOptions) {
    const {
      slug,
      name,
      description,
      rarity,
      slot,
      statsJson = {},
      tagsJson = [],
      value = 0,
      stackable = false,
      maxStack = 1,
      usableJson,
    } = options;

    return this.prisma.itemArchetype.create({
      data: {
        slug,
        name,
        description,
        rarity,
        slot,
        statsJson,
        tagsJson,
        value,
        stackable,
        maxStack,
        usableJson,
      },
    });
  }

  async updateItemArchetype(id: string, updates: Partial<CreateItemArchetypeOptions>) {
    const item = await this.getItemArchetype(id);

    return this.prisma.itemArchetype.update({
      where: { id },
      data: updates,
    });
  }

  async deleteItemArchetype(id: string) {
    const item = await this.getItemArchetype(id);

    // Check if any instances exist
    const instanceCount = await this.prisma.itemInstance.count({
      where: { archetypeSlug: item.slug },
    });

    if (instanceCount > 0) {
      throw new Error(`Cannot delete archetype: ${instanceCount} instances exist`);
    }

    return this.prisma.itemArchetype.delete({
      where: { id },
    });
  }

  async getItemInstances(filters?: {
    archetypeId?: string;
    mintWorldId?: string;
    boundToUserId?: string;
    limit?: number;
    offset?: number;
  }) {
    const {
      archetypeId,
      mintWorldId,
      boundToUserId,
      limit = 50,
      offset = 0,
    } = filters || {};

    const where: any = {};

    if (archetypeId) {
      where.archetypeSlug = archetypeId;
    }

    if (mintWorldId) {
      where.mintWorldId = mintWorldId;
    }

    if (boundToUserId) {
      where.boundToUserId = boundToUserId;
    }

    const [instances, total] = await Promise.all([
      this.prisma.itemInstance.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          archetype: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.itemInstance.count({ where }),
    ]);

    return {
      instances,
      total,
      limit,
      offset,
    };
  }

  async getItemInstance(id: string) {
    const instance = await this.prisma.itemInstance.findUnique({
      where: { id },
      include: {
        archetype: true,
      },
    });

    if (!instance) {
      throw new NotFoundException('Item instance not found');
    }

    return instance;
  }

  async getItemsByRarity(rarity: string) {
    return this.prisma.itemArchetype.findMany({
      where: {
        rarity: rarity.toUpperCase() as any,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getItemsBySlot(slot: string) {
    return this.prisma.itemArchetype.findMany({
      where: {
        slot: slot.toUpperCase() as any,
      },
      orderBy: { name: 'asc' },
    });
  }

  async searchItems(query: string, limit: number = 20) {
    return this.prisma.itemArchetype.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  async getPopularItems(limit: number = 10) {
    // Get items that appear most frequently in inventories
    const result = await this.prisma.$queryRaw`
      SELECT 
        ia.id,
        ia.name,
        ia.slug,
        ia.rarity,
        ia.slot,
        COUNT(ii.id) as usage_count
      FROM "item_archetypes" ia
      JOIN "item_instances" inst ON inst."archetype_slug" = ia.slug
      JOIN "inventory_items" ii ON ii."item_instance_id" = inst.id
      GROUP BY ia.id, ia.name, ia.slug, ia.rarity, ia.slot
      ORDER BY usage_count DESC
      LIMIT ${limit}
    `;

    return result;
  }
}
