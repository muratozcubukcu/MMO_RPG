import {
  Controller,
  All,
  Req,
  Res,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProxyService } from './proxy.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All('worlds/:id/commands')
  async gameCommands(
    @Param('id') worldId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const user = req.user as any;
      const result = await this.proxyService.proxyRequest(
        'game',
        `/worlds/${worldId}/commands`,
        req.method as any,
        {
          ...req.body,
          userId: user.userId, // Inject user ID from JWT
        },
        {
          'x-user-id': user.userId,
          'x-user-email': user.email,
        },
      );

      res.json(result);
    } catch (error) {
      if (error instanceof HttpException) {
        res.status(error.getStatus()).json(error.getResponse());
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Internal server error',
        });
      }
    }
  }

  @All('worlds/:id/freeform')
  async gameFreeform(
    @Param('id') worldId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const user = req.user as any;
      const result = await this.proxyService.proxyRequest(
        'game',
        `/worlds/${worldId}/freeform`,
        req.method as any,
        {
          ...req.body,
          userId: user.userId,
        },
        {
          'x-user-id': user.userId,
          'x-user-email': user.email,
        },
      );

      res.json(result);
    } catch (error) {
      if (error instanceof HttpException) {
        res.status(error.getStatus()).json(error.getResponse());
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Internal server error',
        });
      }
    }
  }

  @All('worlds*')
  async worldsProxy(@Req() req: Request, @Res() res: Response) {
    try {
      const user = req.user as any;
      const path = req.url.replace('/api', '');
      
      let service = 'game';
      if (req.url.includes('/worlds') && req.method === 'POST' && !req.url.includes('/commands') && !req.url.includes('/freeform')) {
        service = 'worldgen'; // World creation goes to worldgen service
      }

      const result = await this.proxyService.proxyRequest(
        service,
        path,
        req.method as any,
        req.method !== 'GET' ? {
          ...req.body,
          userId: user.userId,
        } : undefined,
        {
          'x-user-id': user.userId,
          'x-user-email': user.email,
        },
      );

      res.json(result);
    } catch (error) {
      if (error instanceof HttpException) {
        res.status(error.getStatus()).json(error.getResponse());
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Internal server error',
        });
      }
    }
  }

  @All('inventory*')
  async inventoryProxy(@Req() req: Request, @Res() res: Response) {
    try {
      const user = req.user as any;
      const path = req.url.replace('/api', '');

      const result = await this.proxyService.proxyRequest(
        'inventory',
        path,
        req.method as any,
        req.method !== 'GET' ? {
          ...req.body,
          userId: user.userId,
        } : undefined,
        {
          'x-user-id': user.userId,
          'x-user-email': user.email,
        },
      );

      res.json(result);
    } catch (error) {
      if (error instanceof HttpException) {
        res.status(error.getStatus()).json(error.getResponse());
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Internal server error',
        });
      }
    }
  }

  @All('market*')
  async marketProxy(@Req() req: Request, @Res() res: Response) {
    try {
      const user = req.user as any;
      const path = req.url.replace('/api', '');

      const result = await this.proxyService.proxyRequest(
        'market',
        path,
        req.method as any,
        req.method !== 'GET' ? {
          ...req.body,
          userId: user.userId,
        } : undefined,
        {
          'x-user-id': user.userId,
          'x-user-email': user.email,
        },
      );

      res.json(result);
    } catch (error) {
      if (error instanceof HttpException) {
        res.status(error.getStatus()).json(error.getResponse());
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Internal server error',
        });
      }
    }
  }
}
