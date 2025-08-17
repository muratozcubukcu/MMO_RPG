import { Resolver, Query, Args } from '@nestjs/graphql';
import { ItemService } from './item.service';

@Resolver('Item')
export class ItemResolver {
  constructor(private readonly itemService: ItemService) {}

  @Query()
  async itemArchetypes(
    @Args('rarity', { nullable: true }) rarity?: string,
    @Args('slot', { nullable: true }) slot?: string,
    @Args('tags', { nullable: true }) tags?: string[],
    @Args('search', { nullable: true }) search?: string,
    @Args('limit', { defaultValue: 50 }) limit?: number,
    @Args('offset', { defaultValue: 0 }) offset?: number,
  ) {
    return this.itemService.getItemArchetypes({
      rarity,
      slot,
      tags,
      search,
      limit,
      offset,
    });
  }

  @Query()
  async itemArchetype(@Args('id') id: string) {
    return this.itemService.getItemArchetype(id);
  }

  @Query()
  async itemArchetypeBySlug(@Args('slug') slug: string) {
    return this.itemService.getItemArchetypeBySlug(slug);
  }

  @Query()
  async itemInstances(
    @Args('archetypeId', { nullable: true }) archetypeId?: string,
    @Args('mintWorldId', { nullable: true }) mintWorldId?: string,
    @Args('boundToUserId', { nullable: true }) boundToUserId?: string,
    @Args('limit', { defaultValue: 50 }) limit?: number,
    @Args('offset', { defaultValue: 0 }) offset?: number,
  ) {
    return this.itemService.getItemInstances({
      archetypeId,
      mintWorldId,
      boundToUserId,
      limit,
      offset,
    });
  }

  @Query()
  async itemInstance(@Args('id') id: string) {
    return this.itemService.getItemInstance(id);
  }

  @Query()
  async itemsByRarity(@Args('rarity') rarity: string) {
    return this.itemService.getItemsByRarity(rarity);
  }

  @Query()
  async itemsBySlot(@Args('slot') slot: string) {
    return this.itemService.getItemsBySlot(slot);
  }

  @Query()
  async searchItems(
    @Args('query') query: string,
    @Args('limit', { defaultValue: 20 }) limit?: number,
  ) {
    return this.itemService.searchItems(query, limit);
  }

  @Query()
  async popularItems(@Args('limit', { defaultValue: 10 }) limit?: number) {
    return this.itemService.getPopularItems(limit);
  }
}
