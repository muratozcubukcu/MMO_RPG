import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  format?: 'json';
  options?: {
    temperature?: number;
    top_k?: number;
    top_p?: number;
    num_predict?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly ollamaHost: string;
  private readonly model: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.ollamaHost = this.configService.get<string>('OLLAMA_HOST', 'http://ollama:11434');
    this.model = this.configService.get<string>('OLLAMA_MODEL_WORLDGEN', 'llama3:8b-instruct');
  }

  async generate(request: Partial<OllamaGenerateRequest>): Promise<OllamaGenerateResponse> {
    const startTime = Date.now();
    
    try {
      const fullRequest: OllamaGenerateRequest = {
        model: this.model,
        format: 'json',
        options: {
          temperature: 0.7, // More creative for world generation
          num_predict: 2048, // Longer responses for world content
        },
        ...request,
      };

      this.logger.debug(`Generating world content with Ollama...`);

      const response = await firstValueFrom(
        this.httpService.post<OllamaGenerateResponse>(
          `${this.ollamaHost}/api/generate`,
          fullRequest,
          {
            timeout: 120000, // 2 minute timeout for world generation
          },
        ),
      );

      const duration = Date.now() - startTime;
      this.logger.debug(`Ollama world generation completed in ${duration}ms`);

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Ollama world generation failed after ${duration}ms:`, error.message);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.ollamaHost}/api/tags`, {
          timeout: 5000,
        }),
      );
      
      // Check if our model is available
      const models = response.data.models || [];
      const hasModel = models.some((m: any) => m.name === this.model);
      
      if (!hasModel) {
        this.logger.warn(`Model ${this.model} not found in Ollama`);
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.error('Ollama health check failed:', error.message);
      return false;
    }
  }
}
