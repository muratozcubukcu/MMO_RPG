import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { CommandProcessor } from './command-processor.service';
import { EventEmitter } from './event-emitter.service';

@Module({
  imports: [HttpModule],
  controllers: [GameController],
  providers: [GameService, PlayerService, CommandProcessor, EventEmitter],
  exports: [GameService, PlayerService],
})
export class GameModule {}
