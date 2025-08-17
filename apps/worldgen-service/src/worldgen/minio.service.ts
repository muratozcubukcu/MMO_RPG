import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'http://minio:9000');
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'minio');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minio123');
    this.bucketName = this.configService.get<string>('MINIO_BUCKET', 'worlds');

    // Parse endpoint
    const url = new URL(endpoint);
    const useSSL = url.protocol === 'https:';
    const port = url.port ? parseInt(url.port) : (useSSL ? 443 : 80);

    this.client = new Minio.Client({
      endPoint: url.hostname,
      port,
      useSSL,
      accessKey,
      secretKey,
    });
  }

  async onModuleInit() {
    try {
      // Ensure bucket exists
      const bucketExists = await this.client.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.client.makeBucket(this.bucketName);
        this.logger.log(`Created bucket: ${this.bucketName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to initialize MinIO: ${error.message}`);
    }
  }

  async uploadObject(objectName: string, data: string | Buffer): Promise<string> {
    try {
      const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
      
      await this.client.putObject(this.bucketName, objectName, buffer, buffer.length, {
        'Content-Type': 'application/json',
      });

      this.logger.debug(`Uploaded object: ${objectName}`);
      
      // Return the URL for accessing the object
      return `${this.configService.get('MINIO_ENDPOINT')}/${this.bucketName}/${objectName}`;
    } catch (error) {
      this.logger.error(`Failed to upload object ${objectName}:`, error.message);
      throw error;
    }
  }

  async getObject(objectName: string): Promise<Buffer> {
    try {
      const stream = await this.client.getObject(this.bucketName, objectName);
      
      const chunks: Buffer[] = [];
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    } catch (error) {
      this.logger.error(`Failed to get object ${objectName}:`, error.message);
      throw error;
    }
  }

  async deleteObject(objectName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, objectName);
      this.logger.debug(`Deleted object: ${objectName}`);
    } catch (error) {
      this.logger.error(`Failed to delete object ${objectName}:`, error.message);
      throw error;
    }
  }

  async objectExists(objectName: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucketName, objectName);
      return true;
    } catch (error) {
      return false;
    }
  }
}
