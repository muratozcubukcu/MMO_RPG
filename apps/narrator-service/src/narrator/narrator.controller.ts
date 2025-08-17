import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  NarrativeRequest,
  NarrativeResponse,
  NarrativeRequestSchema,
} from '@ai-mmo/shared-types';
import { NarratorService } from './narrator.service';

@Controller('narrate')
export class NarratorController {
  constructor(private readonly narratorService: NarratorService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async generateNarrative(@Body() request: NarrativeRequest): Promise<NarrativeResponse> {
    // Validate request
    const validatedRequest = NarrativeRequestSchema.parse(request);
    
    return this.narratorService.generateNarrative(validatedRequest);
  }
}
