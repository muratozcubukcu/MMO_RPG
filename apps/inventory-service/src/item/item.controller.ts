import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ItemService, CreateItemArchetypeOptions } from './item.service';

@Controller('items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Get('archetypes')
  async getItemArchetypes(
    @Query('rarity') rarity?: string,
    @Query('slot') slot?: string,
    @Query('tags') tags?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters = {
      rarity,
      slot,
      tags: tags ? tags.split(',') : undefined,
      search,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    };

    const result = await this.itemService.getItemArchetypes(filters);
    
    return {
      success: true,
      data: result,
    };
  }

  @Get('archetypes/:id')
  async getItemArchetype(@Param('id') id: string) {
    const item = await this.itemService.getItemArchetype(id);
    
    return {
      success: true,
      data: item,
    };
  }

  @Get('archetypes/slug/:slug')
  async getItemArchetypeBySlug(@Param('slug') slug: string) {
    const item = await this.itemService.getItemArchetypeBySlug(slug);
    
    return {
      success: true,
      data: item,
    };
  }

  @Post('archetypes')
  @HttpCode(HttpStatus.CREATED)
  async createItemArchetype(@Body() dto: CreateItemArchetypeOptions) {
    const item = await this.itemService.createItemArchetype(dto);
    
    return {
      success: true,
      data: item,
      message: 'Item archetype created successfully',
    };
  }

  @Put('archetypes/:id')
  async updateItemArchetype(
    @Param('id') id: string,
    @Body() updates: Partial<CreateItemArchetypeOptions>,
  ) {
    const item = await this.itemService.updateItemArchetype(id, updates);
    
    return {
      success: true,
      data: item,
      message: 'Item archetype updated successfully',
    };
  }

  @Delete('archetypes/:id')
  async deleteItemArchetype(@Param('id') id: string) {
    await this.itemService.deleteItemArchetype(id);
    
    return {
      success: true,
      message: 'Item archetype deleted successfully',
    };
  }

  @Get('instances')
  async getItemInstances(
    @Query('archetypeId') archetypeId?: string,
    @Query('mintWorldId') mintWorldId?: string,
    @Query('boundToUserId') boundToUserId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters = {
      archetypeId,
      mintWorldId,
      boundToUserId,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    };

    const result = await this.itemService.getItemInstances(filters);
    
    return {
      success: true,
      data: result,
    };
  }

  @Get('instances/:id')
  async getItemInstance(@Param('id') id: string) {
    const instance = await this.itemService.getItemInstance(id);
    
    return {
      success: true,
      data: instance,
    };
  }

  @Get('rarity/:rarity')
  async getItemsByRarity(@Param('rarity') rarity: string) {
    const items = await this.itemService.getItemsByRarity(rarity);
    
    return {
      success: true,
      data: items,
    };
  }

  @Get('slot/:slot')
  async getItemsBySlot(@Param('slot') slot: string) {
    const items = await this.itemService.getItemsBySlot(slot);
    
    return {
      success: true,
      data: items,
    };
  }

  @Get('search/:query')
  async searchItems(
    @Param('query') query: string,
    @Query('limit') limit?: string,
  ) {
    const items = await this.itemService.searchItems(
      query,
      limit ? parseInt(limit) : undefined,
    );
    
    return {
      success: true,
      data: items,
    };
  }

  @Get('popular')
  async getPopularItems(@Query('limit') limit?: string) {
    const items = await this.itemService.getPopularItems(
      limit ? parseInt(limit) : undefined,
    );
    
    return {
      success: true,
      data: items,
    };
  }
}
