import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  InterpreterRequest,
  InterpreterResponse,
  InterpreterRequestSchema,
} from '@ai-mmo/shared-types';
import { InterpreterService } from './interpreter.service';

@Controller('interpret')
export class InterpreterController {
  constructor(private readonly interpreterService: InterpreterService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async interpret(@Body() request: InterpreterRequest): Promise<InterpreterResponse> {
    // Validate request
    const validatedRequest = InterpreterRequestSchema.parse(request);
    
    return this.interpreterService.interpret(validatedRequest);
  }
}
