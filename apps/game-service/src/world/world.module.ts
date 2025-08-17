import { Module } from '@nestjs/common';
import { WorldResolver } from './world.resolver';
import { WorldService } from './world.service';

@Module({
  providers: [WorldResolver, WorldService],
  exports: [WorldService],
})
export class WorldModule {}
