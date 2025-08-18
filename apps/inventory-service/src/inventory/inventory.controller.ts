import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InventoryService, UseItemOptions } from './inventory.service';

export class UseItemDto {
  itemInstanceId: string;
  quantity?: number;
}

export class EquipItemDto {
  itemInstanceId: string;
  slot: string;
}

export class AddItemDto {
  itemInstanceId: string;
  quantity?: number;
}

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async getInventory(@Headers('x-user-id') userId: string) {
    const inventory = await this.inventoryService.getInventory(userId);
    
    return {
      success: true,
      data: inventory,
    };
  }

  @Post('use')
  @HttpCode(HttpStatus.OK)
  async useItem(
    @Body() dto: UseItemDto,
    @Headers('x-user-id') userId: string,
  ) {
    const options: UseItemOptions = {
      userId,
      itemInstanceId: dto.itemInstanceId,
      quantity: dto.quantity,
    };

    const result = await this.inventoryService.useItem(options);
    
    return {
      success: true,
      data: result,
      message: `Used ${result.itemUsed.name}`,
    };
  }

  @Post('equip')
  @HttpCode(HttpStatus.OK)
  async equipItem(
    @Body() dto: EquipItemDto,
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.inventoryService.equipItem(
      userId,
      dto.itemInstanceId,
      dto.slot,
    );
    
    return {
      success: true,
      data: result,
      message: `Equipped ${result.itemInstance?.archetype?.name || 'item'}`,
    };
  }

  @Post('unequip/:itemInstanceId')
  @HttpCode(HttpStatus.OK)
  async unequipItem(
    @Param('itemInstanceId') itemInstanceId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.inventoryService.unequipItem(userId, itemInstanceId);
    
    return {
      success: true,
      data: result,
      message: `Unequipped ${result.itemInstance?.archetype?.name || 'item'}`,
    };
  }

  @Get('equipped')
  async getEquippedItems(@Headers('x-user-id') userId: string) {
    const equippedItems = await this.inventoryService.getEquippedItems(userId);
    
    return {
      success: true,
      data: equippedItems,
    };
  }

  @Get('stats')
  async getTotalStats(@Headers('x-user-id') userId: string) {
    const stats = await this.inventoryService.calculateTotalStats(userId);
    
    return {
      success: true,
      data: stats,
    };
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  async addItem(
    @Body() dto: AddItemDto,
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.inventoryService.addItemToInventory({
      userId,
      itemInstanceId: dto.itemInstanceId,
      quantity: dto.quantity,
    });
    
    return {
      success: true,
      data: result,
      message: `Added ${result.itemInstance?.archetype?.name || 'item'} to inventory`,
    };
  }

  @Delete(':itemInstanceId')
  async removeItem(
    @Param('itemInstanceId') itemInstanceId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.inventoryService.removeItemFromInventory(
      userId,
      itemInstanceId,
      1,
    );
    
    return {
      success: true,
      data: result,
      message: 'Item removed from inventory',
    };
  }
}
