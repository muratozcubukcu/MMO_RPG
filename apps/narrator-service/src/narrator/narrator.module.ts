import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NarratorController } from './narrator.controller';
import { NarratorService } from './narrator.service';
import { OllamaService } from './ollama.service';

@Module({
  imports: [HttpModule],
  controllers: [NarratorController],
  providers: [NarratorService, OllamaService],
})
export class NarratorModule {}
