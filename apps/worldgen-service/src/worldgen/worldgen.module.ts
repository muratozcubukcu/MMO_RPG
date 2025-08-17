import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { WorldGenController } from './worldgen.controller';
import { WorldGenService } from './worldgen.service';
import { WorldGenProcessor } from './worldgen.processor';
import { OllamaService } from './ollama.service';
import { MinioService } from './minio.service';

@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({
      name: 'worldgen',
    }),
  ],
  controllers: [WorldGenController],
  providers: [WorldGenService, WorldGenProcessor, OllamaService, MinioService],
})
export class WorldGenModule {}
