import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateEscrowOptions {
  orderId: string;
  sellerId: string;
  itemInstanceId: string;
  quantity: number;
}

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createEscrow(options: CreateEscrowOptions) {
    const { orderId, sellerId, itemInstanceId, quantity } = options;

    // Get seller's inventory
    const inventory = await this.prisma.inventory.findUnique({
      where: { userId: sellerId },
    });

    if (!inventory) {
      throw new Error('Seller inventory not found');
    }

    // Remove item from seller's inventory and put in escrow
    await this.prisma.$transaction(async (tx) => {
      // Remove from inventory
      const inventoryItem = await tx.inventoryItem.findUnique({
        where: {
          inventoryId_itemInstanceId: {
            inventoryId: inventory.id,
            itemInstanceId,
          },
        },
      });

      if (!inventoryItem || inventoryItem.quantity < quantity) {
        throw new Error('Insufficient item quantity in inventory');
      }

      if (inventoryItem.quantity === quantity) {
        // Remove item completely
        await tx.inventoryItem.delete({
          where: {
            inventoryId_itemInstanceId: {
              inventoryId: inventory.id,
              itemInstanceId,
            },
          },
        });
      } else {
        // Reduce quantity
        await tx.inventoryItem.update({
          where: {
            inventoryId_itemInstanceId: {
              inventoryId: inventory.id,
              itemInstanceId,
            },
          },
          data: {
            quantity: inventoryItem.quantity - quantity,
          },
        });
      }

      // Create escrow record
      await tx.escrow.create({
        data: {
          orderId,
          sellerWalletId: `${sellerId}-wallet`, // Simplified wallet ID
          itemInstanceId,
          quantity,
          status: 'ACTIVE',
        },
      });
    });

    this.logger.log(`Created escrow for order ${orderId}: ${quantity}x item ${itemInstanceId}`);
  }

  async releaseEscrow(orderId: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { orderId },
      include: {
        order: true,
      },
    });

    if (!escrow || escrow.status !== 'ACTIVE') {
      throw new Error('Active escrow not found');
    }

    // Get seller's inventory
    const inventory = await this.prisma.inventory.findUnique({
      where: { userId: escrow.order.userId },
    });

    if (!inventory) {
      throw new Error('Seller inventory not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Return item to seller's inventory
      const existingItem = await tx.inventoryItem.findUnique({
        where: {
          inventoryId_itemInstanceId: {
            inventoryId: inventory.id,
            itemInstanceId: escrow.itemInstanceId,
          },
        },
      });

      if (existingItem) {
        // Add to existing stack
        await tx.inventoryItem.update({
          where: {
            inventoryId_itemInstanceId: {
              inventoryId: inventory.id,
              itemInstanceId: escrow.itemInstanceId,
            },
          },
          data: {
            quantity: existingItem.quantity + escrow.quantity,
          },
        });
      } else {
        // Create new inventory item
        await tx.inventoryItem.create({
          data: {
            inventoryId: inventory.id,
            itemInstanceId: escrow.itemInstanceId,
            quantity: escrow.quantity,
            equipped: false,
          },
        });
      }

      // Mark escrow as released
      await tx.escrow.update({
        where: { orderId },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
        },
      });
    });

    this.logger.log(`Released escrow for order ${orderId}`);
  }

  async transferFromEscrow(orderId: string, buyerId: string, quantity: number) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { orderId },
    });

    if (!escrow || escrow.status !== 'ACTIVE') {
      throw new Error('Active escrow not found');
    }

    if (escrow.quantity < quantity) {
      throw new Error('Insufficient quantity in escrow');
    }

    // Get buyer's inventory
    let buyerInventory = await this.prisma.inventory.findUnique({
      where: { userId: buyerId },
    });

    if (!buyerInventory) {
      // Create inventory if it doesn't exist
      buyerInventory = await this.prisma.inventory.create({
        data: { userId: buyerId },
      });
    }

    await this.prisma.$transaction(async (tx) => {
      // Add item to buyer's inventory
      const existingItem = await tx.inventoryItem.findUnique({
        where: {
          inventoryId_itemInstanceId: {
            inventoryId: buyerInventory.id,
            itemInstanceId: escrow.itemInstanceId,
          },
        },
      });

      if (existingItem) {
        // Add to existing stack
        await tx.inventoryItem.update({
          where: {
            inventoryId_itemInstanceId: {
              inventoryId: buyerInventory.id,
              itemInstanceId: escrow.itemInstanceId,
            },
          },
          data: {
            quantity: existingItem.quantity + quantity,
          },
        });
      } else {
        // Create new inventory item
        await tx.inventoryItem.create({
          data: {
            inventoryId: buyerInventory.id,
            itemInstanceId: escrow.itemInstanceId,
            quantity,
            equipped: false,
          },
        });
      }

      // Update escrow
      if (escrow.quantity === quantity) {
        // Complete transfer
        await tx.escrow.update({
          where: { orderId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
      } else {
        // Partial transfer
        await tx.escrow.update({
          where: { orderId },
          data: {
            quantity: escrow.quantity - quantity,
          },
        });
      }
    });

    this.logger.log(`Transferred ${quantity}x item ${escrow.itemInstanceId} from escrow to buyer ${buyerId}`);
  }

  async getEscrowStatus(orderId: string) {
    return this.prisma.escrow.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            itemInstance: {
              include: { archetype: true },
            },
          },
        },
      },
    });
  }
}
