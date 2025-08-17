import axios, { AxiosInstance } from 'axios';
import {
  WorldPromptInput,
  CommandRequest,
  FreeformCommandRequest,
  CommandOutcome,
} from '@ai-mmo/shared-types';

export interface AIMMOClientConfig {
  baseURL: string;
  wsURL?: string;
  apiKey?: string;
  timeout?: number;
}

export class AIMMOClient {
  private api: AxiosInstance;
  private wsURL?: string;

  constructor(config: AIMMOClientConfig) {
    this.api = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: config.apiKey ? {
        'Authorization': `Bearer ${config.apiKey}`,
      } : {},
    });

    this.wsURL = config.wsURL;
  }

  // Auth methods
  async register(email: string, username: string, password: string) {
    const response = await this.api.post('/auth/register', {
      email,
      username,
      password,
    });
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', {
      email,
      password,
    });
    
    if (response.data.accessToken) {
      this.api.defaults.headers['Authorization'] = `Bearer ${response.data.accessToken}`;
    }
    
    return response.data;
  }

  // World methods
  async createWorld(input: WorldPromptInput) {
    const response = await this.api.post('/worlds', input);
    return response.data;
  }

  async getWorld(worldId: string) {
    const response = await this.api.get(`/worlds/${worldId}`);
    return response.data;
  }

  async getWorlds(limit: number = 20, offset: number = 0) {
    const response = await this.api.get('/worlds', {
      params: { limit, offset },
    });
    return response.data;
  }

  // Game methods
  async executeCommand(worldId: string, request: CommandRequest): Promise<CommandOutcome> {
    const response = await this.api.post(`/worlds/${worldId}/commands`, request);
    return response.data;
  }

  async executeFreeformCommand(worldId: string, request: FreeformCommandRequest): Promise<CommandOutcome> {
    const response = await this.api.post(`/worlds/${worldId}/freeform`, request);
    return response.data;
  }

  async getPlayerState(worldId: string) {
    const response = await this.api.get(`/worlds/${worldId}/player`);
    return response.data;
  }

  // Inventory methods
  async getInventory() {
    const response = await this.api.get('/inventory');
    return response.data;
  }

  async useItem(itemInstanceId: string, quantity: number = 1) {
    const response = await this.api.post('/inventory/use', {
      itemInstanceId,
      quantity,
    });
    return response.data;
  }

  async equipItem(itemInstanceId: string, slot: string) {
    const response = await this.api.post('/inventory/equip', {
      itemInstanceId,
      slot,
    });
    return response.data;
  }

  async unequipItem(itemInstanceId: string) {
    const response = await this.api.post(`/inventory/unequip/${itemInstanceId}`);
    return response.data;
  }

  // Market methods
  async createOrder(order: {
    itemInstanceId: string;
    type: 'LIMIT' | 'AUCTION';
    side: 'BUY' | 'SELL';
    price: number;
    quantity: number;
  }) {
    const response = await this.api.post('/market/orders', order);
    return response.data;
  }

  async cancelOrder(orderId: string) {
    const response = await this.api.delete(`/market/orders/${orderId}`);
    return response.data;
  }

  async getOrderBook(itemInstanceId?: string) {
    const response = await this.api.get('/market/orderbook', {
      params: itemInstanceId ? { itemInstanceId } : {},
    });
    return response.data;
  }

  async getUserOrders(status?: string) {
    const response = await this.api.get('/market/orders', {
      params: status ? { status } : {},
    });
    return response.data;
  }

  async getTradeHistory(itemInstanceId?: string) {
    const response = await this.api.get('/market/trades', {
      params: itemInstanceId ? { itemInstanceId } : {},
    });
    return response.data;
  }

  // WebSocket connection (basic)
  connectWebSocket(userId: string) {
    if (!this.wsURL) {
      throw new Error('WebSocket URL not provided');
    }

    // This would typically use Socket.IO client
    // For now, just return the URL for manual connection
    return {
      url: this.wsURL,
      channels: {
        user: `user:${userId}`,
        world: (worldId: string) => `world:${worldId}`,
        market: (itemInstanceId: string) => `market:${itemInstanceId}`,
      },
    };
  }
}

export default AIMMOClient;
