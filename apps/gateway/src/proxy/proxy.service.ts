import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProxyService {
  private readonly serviceUrls: Record<string, string>;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.serviceUrls = {
      game: this.configService.get<string>('GAME_SERVICE_URL', 'http://game-service:3001'),
      inventory: this.configService.get<string>('INVENTORY_SERVICE_URL', 'http://inventory-service:3005'),
      market: this.configService.get<string>('MARKET_SERVICE_URL', 'http://market-service:3006'),
      worldgen: this.configService.get<string>('WORLDGEN_SERVICE_URL', 'http://worldgen-service:3002'),
    };
  }

  async proxyRequest(
    service: string,
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    data?: any,
    headers?: Record<string, string>,
  ): Promise<any> {
    const serviceUrl = this.serviceUrls[service];
    if (!serviceUrl) {
      throw new HttpException(
        `Unknown service: ${service}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const url = `${serviceUrl}${path}`;

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url,
          data,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          timeout: 30000, // 30 second timeout
        }),
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw new HttpException(
          error.response.data || 'Service error',
          error.response.status,
        );
      } else if (error.request) {
        // The request was made but no response was received
        throw new HttpException(
          `Service ${service} is unavailable`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new HttpException(
          'Request configuration error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}
