import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { WorldService } from './world.service';

// GraphQL types (simplified for now)
@Resolver('World')
export class WorldResolver {
  constructor(private readonly worldService: WorldService) {}

  @Query()
  async world(@Args('id') id: string) {
    return this.worldService.findWorld(id);
  }

  @Query()
  async worlds(
    @Args('take', { defaultValue: 20 }) take: number,
    @Args('skip', { defaultValue: 0 }) skip: number,
  ) {
    return this.worldService.findWorlds(take, skip);
  }

  @Query()
  async playerState(
    @Args('worldId') worldId: string,
    @Context() context: any,
  ) {
    // In a real implementation, you'd extract userId from JWT context
    const userId = context.req?.user?.userId;
    if (!userId) {
      throw new Error('Authentication required');
    }

    return this.worldService.findPlayerState(userId, worldId);
  }
}
