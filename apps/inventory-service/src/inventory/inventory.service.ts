import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export interface CreateItemInstanceOptions {
  archetypeSlug: string;
  mintWorldId: string;
  rollDataJson?: any;
  boundToUserId?: string;
}

export interface AddItemToInventoryOptions {
  userId: string;
  itemInstanceId: string;
  quantity?: number;
  equipped?: boolean;
  slot?: string;
}

export interface UseItemOptions {
  userId: string;
  itemInstanceId: string;
  quantity?: number;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getInventory(userId: string) {
    // Get or create inventory
    let inventory = await this.prisma.inventory.findUnique({
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

    if (!inventory) {
      inventory = await this.prisma.inventory.create({
        data: { userId },
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
    }

    return inventory;
  }

  async createItemInstance(options: CreateItemInstanceOptions) {
    const { archetypeSlug, mintWorldId, rollDataJson, boundToUserId } = options;

    // Verify archetype exists
    const archetype = await this.prisma.itemArchetype.findUnique({
      where: { slug: archetypeSlug },
    });

    if (!archetype) {
      throw new NotFoundException('Item archetype not found');
    }

    // Create item instance
    const itemInstance = await this.prisma.itemInstance.create({
      data: {
        archetypeSlug,
        mintWorldId,
        rollDataJson: rollDataJson || {},
        boundToUserId,
      },
      include: {
        archetype: true,
      },
    });

    return itemInstance;
  }

  async addItemToInventory(options: AddItemToInventoryOptions) {
    const { userId, itemInstanceId, quantity = 1, equipped = false, slot } = options;

    // Get or create inventory
    const inventory = await this.getInventory(userId);

    // Verify item instance exists
    const itemInstance = await this.prisma.itemInstance.findUnique({
      where: { id: itemInstanceId },
      include: { archetype: true },
    });

    if (!itemInstance) {
      throw new NotFoundException('Item instance not found');
    }

    // Check if item is bound to another user
    if (itemInstance.boundToUserId && itemInstance.boundToUserId !== userId) {
      throw new BadRequestException('Item is bound to another user');
    }

    // Check if item already exists in inventory
    const existingItem = await this.prisma.inventoryItem.findUnique({
      where: {
        inventoryId_itemInstanceId: {
          inventoryId: inventory.id,
          itemInstanceId,
        },
      },
    });

    if (existingItem) {
      // Update quantity if stackable
      if (itemInstance.archetype.stackable) {
        const newQuantity = existingItem.quantity + quantity;
        const maxStack = itemInstance.archetype.maxStack || 999;
        
        if (newQuantity > maxStack) {
          throw new BadRequestException(`Cannot stack more than ${maxStack} items`);
        }

        return this.prisma.inventoryItem.update({
          where: {
            inventoryId_itemInstanceId: {
              inventoryId: inventory.id,
              itemInstanceId,
            },
          },
          data: { quantity: newQuantity },
          include: {
            itemInstance: {
              include: { archetype: true },
            },
          },
        });
      } else {
        throw new BadRequestException('Item already exists in inventory and is not stackable');
      }
    }

    // Add new item to inventory
    return this.prisma.inventoryItem.create({
      data: {
        inventoryId: inventory.id,
        itemInstanceId,
        quantity,
        equipped,
      },
      include: {
        itemInstance: {
          include: { archetype: true },
        },
      },
    });
  }

  async removeItemFromInventory(userId: string, itemInstanceId: string, quantity: number = 1) {
    const inventory = await this.getInventory(userId);

    const inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: {
        inventoryId_itemInstanceId: {
          inventoryId: inventory.id,
          itemInstanceId,
        },
      },
      include: {
        itemInstance: {
          include: { archetype: true },
        },
      },
    });

    if (!inventoryItem) {
      throw new NotFoundException('Item not found in inventory');
    }

    if (inventoryItem.quantity < quantity) {
      throw new BadRequestException('Insufficient quantity');
    }

    if (inventoryItem.quantity === quantity) {
      // Remove item completely
      await this.prisma.inventoryItem.delete({
        where: {
          inventoryId_itemInstanceId: {
            inventoryId: inventory.id,
            itemInstanceId,
          },
        },
      });
      return null;
    } else {
      // Reduce quantity
      return this.prisma.inventoryItem.update({
        where: {
          inventoryId_itemInstanceId: {
            inventoryId: inventory.id,
            itemInstanceId,
          },
        },
        data: {
          quantity: inventoryItem.quantity - quantity,
        },
        include: {
          itemInstance: {
            include: { archetype: true },
          },
        },
      });
    }
  }

  async useItem(options: UseItemOptions) {
    const { userId, itemInstanceId, quantity = 1 } = options;

    const inventory = await this.getInventory(userId);

    const inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: {
        inventoryId_itemInstanceId: {
          inventoryId: inventory.id,
          itemInstanceId,
        },
      },
      include: {
        itemInstance: {
          include: { archetype: true },
        },
      },
    });

    if (!inventoryItem) {
      throw new NotFoundException('Item not found in inventory');
    }

    const archetype = inventoryItem.itemInstance.archetype;

    // Check if item is usable
    if (archetype.slot !== 'CONSUMABLE' && !archetype.usableJson) {
      throw new BadRequestException('Item is not usable');
    }

    if (inventoryItem.quantity < quantity) {
      throw new BadRequestException('Insufficient quantity');
    }

    // Process usage effects
    const effects = archetype.usableJson as any;
    const results = [];

    if (effects?.effects) {
      for (const effect of effects.effects) {
        switch (effect.type) {
          case 'heal':
            results.push({
              type: 'heal',
              value: effect.value,
              description: `Restored ${effect.value} health`,
            });
            break;
          case 'mana':
            results.push({
              type: 'mana',
              value: effect.value,
              description: `Restored ${effect.value} mana`,
            });
            break;
          case 'buff':
            results.push({
              type: 'buff',
              stat: effect.stat,
              value: effect.value,
              duration: effect.duration,
              description: `+${effect.value} ${effect.stat} for ${effect.duration} seconds`,
            });
            break;
          default:
            results.push({
              type: 'unknown',
              description: `Unknown effect: ${effect.type}`,
            });
        }
      }
    }

    // Consume the item if it's consumable
    if (archetype.slot === 'CONSUMABLE') {
      await this.removeItemFromInventory(userId, itemInstanceId, quantity);
    }

    return {
      itemUsed: {
        name: archetype.name,
        quantity,
      },
      effects: results,
    };
  }

  async equipItem(userId: string, itemInstanceId: string, slot: string) {
    const inventory = await this.getInventory(userId);

    const inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: {
        inventoryId_itemInstanceId: {
          inventoryId: inventory.id,
          itemInstanceId,
        },
      },
      include: {
        itemInstance: {
          include: { archetype: true },
        },
      },
    });

    if (!inventoryItem) {
      throw new NotFoundException('Item not found in inventory');
    }

    const archetype = inventoryItem.itemInstance.archetype;

    // Check if item can be equipped in this slot
    if (archetype.slot !== slot.toUpperCase()) {
      throw new BadRequestException(`Item cannot be equipped in ${slot} slot`);
    }

    // Unequip any existing item in this slot (check by archetype slot)
    const existingEquipped = await this.prisma.inventoryItem.findMany({
      where: {
        inventoryId: inventory.id,
        equipped: true,
        itemInstance: {
          archetype: {
            slot: archetype.slot,
          },
        },
      },
    });

    // Unequip existing items of the same slot type
    for (const item of existingEquipped) {
      await this.prisma.inventoryItem.update({
        where: {
          inventoryId_itemInstanceId: {
            inventoryId: inventory.id,
            itemInstanceId: item.itemInstanceId,
          },
        },
        data: { equipped: false },
      });
    }

    // Equip the new item
    return this.prisma.inventoryItem.update({
      where: {
        inventoryId_itemInstanceId: {
          inventoryId: inventory.id,
          itemInstanceId,
        },
      },
      data: {
        equipped: true,
      },
      include: {
        itemInstance: {
          include: { archetype: true },
        },
      },
    });
  }

  async unequipItem(userId: string, itemInstanceId: string) {
    const inventory = await this.getInventory(userId);

    const inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: {
        inventoryId_itemInstanceId: {
          inventoryId: inventory.id,
          itemInstanceId,
        },
      },
      include: {
        itemInstance: {
          include: { archetype: true },
        },
      },
    });

    if (!inventoryItem) {
      throw new NotFoundException('Item not found in inventory');
    }

    if (!inventoryItem.equipped) {
      throw new BadRequestException('Item is not equipped');
    }

    return this.prisma.inventoryItem.update({
      where: {
        inventoryId_itemInstanceId: {
          inventoryId: inventory.id,
          itemInstanceId,
        },
      },
      data: {
        equipped: false,
      },
      include: {
        itemInstance: {
          include: { archetype: true },
        },
      },
    });
  }

  async getEquippedItems(userId: string) {
    const inventory = await this.getInventory(userId);

    return this.prisma.inventoryItem.findMany({
      where: {
        inventoryId: inventory.id,
        equipped: true,
      },
      include: {
        itemInstance: {
          include: { archetype: true },
        },
      },
    });
  }

  async calculateTotalStats(userId: string) {
    const equippedItems = await this.getEquippedItems(userId);
    const totalStats: Record<string, number> = {};

    for (const item of equippedItems) {
      const itemStats = item.itemInstance.archetype.statsJson as Record<string, number>;
      
      if (itemStats) {
        for (const [stat, value] of Object.entries(itemStats)) {
          totalStats[stat] = (totalStats[stat] || 0) + value;
        }
      }
    }

    return totalStats;
  }
}
