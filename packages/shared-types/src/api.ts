import { z } from 'zod';
import { TimestampSchema, PaginationSchema } from './common';

// HTTP Status codes
export const HttpStatusSchema = z.enum([
  '200', '201', '204', '400', '401', '403', '404', '409', '422', '429', '500', '502', '503'
]);

// Error Schema
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.any()).optional(),
  timestamp: TimestampSchema,
  path: z.string().optional(),
  requestId: z.string().optional()
});

// Success Response Schema
export const ApiSuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    timestamp: TimestampSchema.default(() => new Date()),
    requestId: z.string().optional()
  });

// Error Response Schema
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: ApiErrorSchema,
  timestamp: TimestampSchema.default(() => new Date()),
  requestId: z.string().optional()
});

// Paginated Response Schema
export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.object({
      items: z.array(itemSchema),
      pagination: PaginationSchema
    }),
    timestamp: TimestampSchema.default(() => new Date()),
    requestId: z.string().optional()
  });

// WebSocket Message Schema
export const WebSocketMessageSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  event: z.string(),
  data: z.record(z.string(), z.any()),
  timestamp: TimestampSchema,
  userId: z.string().optional(),
  worldId: z.string().optional(),
  channelId: z.string().optional()
});

// Rate Limit Schema
export const RateLimitSchema = z.object({
  limit: z.number().int().min(1),
  remaining: z.number().int().min(0),
  reset: TimestampSchema,
  retryAfter: z.number().int().min(0).optional()
});

// Health Check Schema
export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  version: z.string(),
  timestamp: TimestampSchema,
  services: z.record(z.string(), z.object({
    status: z.enum(['up', 'down', 'degraded']),
    responseTime: z.number().optional(),
    lastCheck: TimestampSchema.optional(),
    error: z.string().optional()
  })).optional(),
  uptime: z.number().optional(),
  memory: z.object({
    used: z.number(),
    total: z.number(),
    percentage: z.number()
  }).optional()
});

// Validation Error Schema
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  value: z.any().optional(),
  code: z.string().optional()
});

export const ValidationErrorsResponseSchema = z.object({
  success: z.literal(false),
  error: ApiErrorSchema.extend({
    code: z.literal('VALIDATION_ERROR'),
    validationErrors: z.array(ValidationErrorSchema)
  }),
  timestamp: TimestampSchema.default(() => new Date()),
  requestId: z.string().optional()
});

// Request Context Schema (for internal use)
export const RequestContextSchema = z.object({
  requestId: z.string().uuid(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  timestamp: TimestampSchema,
  path: z.string(),
  method: z.string(),
  headers: z.record(z.string(), z.string()).optional()
});

// Audit Log Schema
export const AuditLogSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().optional(),
  changes: z.record(z.string(), z.object({
    old: z.any().optional(),
    new: z.any().optional()
  })).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: TimestampSchema
});

// Metrics Schema
export const MetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  tags: z.record(z.string(), z.string()).optional(),
  timestamp: TimestampSchema
});

// Types
export type HttpStatus = z.infer<typeof HttpStatusSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
export type RateLimit = z.infer<typeof RateLimitSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type RequestContext = z.infer<typeof RequestContextSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
export type Metric = z.infer<typeof MetricSchema>;

// Generic Response Types
export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  timestamp: Date;
  requestId?: string;
};

export type ApiErrorResponse = {
  success: false;
  error: ApiError;
  timestamp: Date;
  requestId?: string;
};

export type PaginatedResponse<T> = {
  success: true;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total?: number;
      totalPages?: number;
    };
  };
  timestamp: Date;
  requestId?: string;
};

export type ValidationErrorsResponse = z.infer<typeof ValidationErrorsResponseSchema>;