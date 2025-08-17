import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InterpreterController } from './interpreter.controller';
import { InterpreterService } from './interpreter.service';
import { OllamaService } from './ollama.service';

@Module({
  imports: [HttpModule],
  controllers: [InterpreterController],
  providers: [InterpreterService, OllamaService],
})
export class InterpreterModule {}
