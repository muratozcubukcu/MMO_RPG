import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { NotificationService, NotificationPayload } from './notification.service';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly socketChannels = new Map<string, Set<string>>();

  constructor(private readonly notificationService: NotificationService) {
    // Register callback for Redis messages
    this.notificationService.setEmitCallback((channel, payload) => {
      this.emitToChannel(channel, payload);
    });
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.socketChannels.set(client.id, new Set());
    
    // Send welcome message
    client.emit('connected', {
      message: 'Connected to AI MMO WebSocket server',
      timestamp: new Date().toISOString(),
    });
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Unsubscribe from all channels
    await this.notificationService.unsubscribeSocket(client.id);
    
    // Clean up socket tracking
    this.socketChannels.delete(client.id);
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ): Promise<void> {
    const { channel } = data;
    
    if (!channel) {
      client.emit('error', { message: 'Channel is required' });
      return;
    }

    try {
      // Track socket subscriptions
      const clientChannels = this.socketChannels.get(client.id) || new Set();
      clientChannels.add(channel);
      this.socketChannels.set(client.id, clientChannels);

      // Subscribe to notification service
      await this.notificationService.subscribeToChannel(client.id, channel);

      // Join Socket.IO room
      await client.join(channel);

      client.emit('subscribed', { 
        channel,
        message: `Subscribed to ${channel}`,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`Client ${client.id} subscribed to channel: ${channel}`);
    } catch (error) {
      this.logger.error(`Subscription error for client ${client.id}:`, error);
      client.emit('error', { 
        message: 'Failed to subscribe to channel',
        channel,
      });
    }
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ): Promise<void> {
    const { channel } = data;
    
    if (!channel) {
      client.emit('error', { message: 'Channel is required' });
      return;
    }

    try {
      // Update socket tracking
      const clientChannels = this.socketChannels.get(client.id);
      if (clientChannels) {
        clientChannels.delete(channel);
      }

      // Unsubscribe from notification service
      await this.notificationService.unsubscribeFromChannel(client.id, channel);

      // Leave Socket.IO room
      await client.leave(channel);

      client.emit('unsubscribed', { 
        channel,
        message: `Unsubscribed from ${channel}`,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`Client ${client.id} unsubscribed from channel: ${channel}`);
    } catch (error) {
      this.logger.error(`Unsubscription error for client ${client.id}:`, error);
      client.emit('error', { 
        message: 'Failed to unsubscribe from channel',
        channel,
      });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', {
      timestamp: new Date().toISOString(),
    });
  }

  // Method to emit to specific channel (called by notification service)
  private emitToChannel(channel: string, payload: NotificationPayload): void {
    this.server.to(channel).emit('notification', payload);
    this.logger.debug(`Emitted notification to channel ${channel}: ${payload.events.length} events`);
  }

  // Method to broadcast to all connected clients
  broadcast(event: string, data: any): void {
    this.server.emit(event, data);
  }

  // Method to emit to specific socket
  emitToSocket(socketId: string, event: string, data: any): void {
    this.server.to(socketId).emit(event, data);
  }

  // Get connection stats
  getStats(): {
    connectedClients: number;
    totalChannels: number;
    channelSubscriptions: Record<string, number>;
  } {
    const channelSubscriptions: Record<string, number> = {};
    
    for (const [channel, subscribers] of this.socketChannels.entries()) {
      for (const channelName of subscribers) {
        channelSubscriptions[channelName] = (channelSubscriptions[channelName] || 0) + 1;
      }
    }

    return {
      connectedClients: this.socketChannels.size,
      totalChannels: Object.keys(channelSubscriptions).length,
      channelSubscriptions,
    };
  }
}
