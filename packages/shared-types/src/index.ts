// World generation schemas and types
export * from './world';

// Game action and state schemas and types
export * from './game';

// Marketplace and economy schemas and types
export * from './marketplace';

// Common utility types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: number;
  id?: string;
}

// User and authentication types
export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: number;
  lastLoginAt?: number;
  isActive: boolean;
  roles: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: number;
  createdAt: number;
  lastActiveAt: number;
  userAgent?: string;
  ipAddress?: string;
}

// Configuration types
export interface ServiceConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  port: number;
  database: {
    url: string;
    ssl?: boolean;
  };
  redis: {
    url: string;
  };
  cors: {
    origins: string[];
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

// Error types
export class GameError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export class ValidationError extends GameError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends GameError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends GameError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends GameError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends GameError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends GameError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'RateLimitError';
  }
}

// Constants
export const GAME_CONSTANTS = {
  MAX_INVENTORY_SIZE: 100,
  MAX_WORLD_SIZE: 500,
  MAX_PLAYERS_PER_WORLD: 50,
  DEFAULT_STARTING_GOLD: 100,
  MAX_ACTIVE_QUESTS: 10,
  RESPAWN_TIME_SECONDS: 30,
  COMBAT_TIMEOUT_SECONDS: 60,
  SESSION_TIMEOUT_HOURS: 24,
  MAX_MESSAGE_LENGTH: 500,
  MIN_WORLD_LOCATIONS: 30,
  MAX_WORLD_LOCATIONS: 500,
  MIN_WORLD_MOBS: 15,
  MAX_WORLD_MOBS: 200,
  MIN_WORLD_QUESTS: 5,
  MAX_WORLD_QUESTS: 100,
  MIN_WORLD_ITEMS: 20,
  MAX_WORLD_ITEMS: 200
} as const;