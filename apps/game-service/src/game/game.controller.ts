import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import {
  CommandRequest,
  FreeformCommandRequest,
  CommandOutcome,
  CommandRequestSchema,
  FreeformCommandRequestSchema,
} from '@ai-mmo/shared-types';
import { GameService } from './game.service';

@Controller()
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('worlds/:worldId/commands')
  @HttpCode(HttpStatus.OK)
  async executeCommand(
    @Param('worldId') worldId: string,
    @Body() request: CommandRequest,
    @Headers('x-user-id') userId: string,
  ): Promise<CommandOutcome> {
    // Validate request
    const validatedRequest = CommandRequestSchema.parse(request);
    
    return this.gameService.executeCommand(worldId, userId, validatedRequest);
  }

  @Post('worlds/:worldId/freeform')
  @HttpCode(HttpStatus.OK)
  async executeFreeformCommand(
    @Param('worldId') worldId: string,
    @Body() request: FreeformCommandRequest,
    @Headers('x-user-id') userId: string,
  ): Promise<CommandOutcome> {
    // Validate request
    const validatedRequest = FreeformCommandRequestSchema.parse(request);
    
    return this.gameService.executeCommand(worldId, userId, validatedRequest);
  }

  @Get('worlds/:worldId')
  async getWorldInfo(@Param('worldId') worldId: string) {
    return this.gameService.getWorldInfo(worldId);
  }

  @Get('worlds/:worldId/player')
  async getPlayerState(
    @Param('worldId') worldId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.gameService.getPlayerState(userId, worldId);
  }
}
