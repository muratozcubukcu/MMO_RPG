import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { InventoryService } from './inventory.service';

@Resolver('Inventory')
export class InventoryResolver {
  constructor(private readonly inventoryService: InventoryService) {}

  @Query()
  async inventory(@Context() context: any) {
    // Extract userId from JWT context
    const userId = context.req?.user?.userId;
    if (!userId) {
      throw new Error('Authentication required');
    }

    return this.inventoryService.getInventory(userId);
  }

  @Query()
  async equippedItems(@Context() context: any) {
    const userId = context.req?.user?.userId;
    if (!userId) {
      throw new Error('Authentication required');
    }

    return this.inventoryService.getEquippedItems(userId);
  }

  @Query()
  async playerStats(@Context() context: any) {
    const userId = context.req?.user?.userId;
    if (!userId) {
      throw new Error('Authentication required');
    }

    return this.inventoryService.calculateTotalStats(userId);
  }

  @Mutation()
  async useItem(
    @Args('itemInstanceId') itemInstanceId: string,
    @Args('quantity', { defaultValue: 1 }) quantity: number,
    @Context() context: any,
  ) {
    const userId = context.req?.user?.userId;
    if (!userId) {
      throw new Error('Authentication required');
    }

    return this.inventoryService.useItem({
      userId,
      itemInstanceId,
      quantity,
    });
  }

  @Mutation()
  async equipItem(
    @Args('itemInstanceId') itemInstanceId: string,
    @Args('slot') slot: string,
    @Context() context: any,
  ) {
    const userId = context.req?.user?.userId;
    if (!userId) {
      throw new Error('Authentication required');
    }

    return this.inventoryService.equipItem(userId, itemInstanceId, slot);
  }

  @Mutation()
  async unequipItem(
    @Args('itemInstanceId') itemInstanceId: string,
    @Context() context: any,
  ) {
    const userId = context.req?.user?.userId;
    if (!userId) {
      throw new Error('Authentication required');
    }

    return this.inventoryService.unequipItem(userId, itemInstanceId);
  }
}
