import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  WorldPromptInput,
  WorldPromptInputSchema,
} from '@ai-mmo/shared-types';
import { WorldGenService } from './worldgen.service';

@Controller()
export class WorldGenController {
  constructor(private readonly worldgenService: WorldGenService) {}

  @Post('worlds')
  @HttpCode(HttpStatus.CREATED)
  async createWorld(
    @Body() input: WorldPromptInput,
    @Headers('x-user-id') userId: string,
  ) {
    // Validate input
    const validatedInput = WorldPromptInputSchema.parse(input);
    
    const result = await this.worldgenService.createWorld(userId, validatedInput);
    
    return {
      success: true,
      data: result,
      message: 'World generation started',
    };
  }

  @Get('worlds/:worldId')
  async getWorld(@Param('worldId') worldId: string) {
    const world = await this.worldgenService.getWorld(worldId);
    
    if (!world) {
      return {
        success: false,
        message: 'World not found',
      };
    }
    
    return {
      success: true,
      data: world,
    };
  }

  @Get('worlds')
  async getWorlds(
    @Headers('x-user-id') userId?: string,
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0',
    @Query('own') own: string = 'false',
  ) {
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const parsedOffset = Math.max(0, parseInt(offset) || 0);
    const ownOnly = own === 'true';
    
    const worlds = await this.worldgenService.getWorlds(
      ownOnly ? userId : undefined,
      parsedLimit,
      parsedOffset,
    );
    
    return {
      success: true,
      data: worlds,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        count: worlds.length,
      },
    };
  }

  @Get('jobs/:jobId')
  async getWorldGenJob(@Param('jobId') jobId: string) {
    const job = await this.worldgenService.getWorldGenJob(jobId);
    
    if (!job) {
      return {
        success: false,
        message: 'Job not found',
      };
    }
    
    return {
      success: true,
      data: job,
    };
  }

  @Get('jobs')
  async getWorldGenJobs(@Headers('x-user-id') userId: string) {
    const jobs = await this.worldgenService.getWorldGenJobs(userId);
    
    return {
      success: true,
      data: jobs,
    };
  }
}
