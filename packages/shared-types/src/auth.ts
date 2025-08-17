import { z } from 'zod';
import { IdSchema, EmailSchema, TimestampSchema } from './common';

// User schemas
export const UserSchema = z.object({
  id: IdSchema,
  email: EmailSchema,
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(1).max(50),
  avatar: z.string().url().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  lastLoginAt: TimestampSchema.optional(),
  isActive: z.boolean().default(true),
  role: z.enum(['player', 'moderator', 'admin']).default('player')
});

export const CreateUserSchema = z.object({
  email: EmailSchema,
  username: UserSchema.shape.username,
  displayName: UserSchema.shape.displayName,
  password: z.string().min(8).max(128)
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string()
});

export const SessionSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  token: z.string(),
  expiresAt: TimestampSchema,
  createdAt: TimestampSchema,
  lastUsedAt: TimestampSchema,
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
});

export const JWTPayloadSchema = z.object({
  userId: IdSchema,
  sessionId: IdSchema,
  role: UserSchema.shape.role,
  iat: z.number(),
  exp: z.number()
});

// Auth API schemas
export const RegisterRequestSchema = CreateUserSchema;
export const RegisterResponseSchema = z.object({
  user: UserSchema.omit({ updatedAt: true, lastLoginAt: true }),
  token: z.string(),
  expiresAt: TimestampSchema
});

export const LoginRequestSchema = LoginSchema;
export const LoginResponseSchema = RegisterResponseSchema;

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string()
});

export const LogoutRequestSchema = z.object({
  sessionId: IdSchema.optional()
});

// Types
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type Login = z.infer<typeof LoginSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;