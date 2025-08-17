import { z } from 'zod';
import { IdSchema, StringTimestampSchema } from './common';

// Auth request/response schemas
export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  user: z.object({
    id: IdSchema,
    email: z.string().email(),
    username: z.string(),
    createdAt: StringTimestampSchema,
  }),
});

// JWT payload
export const JWTPayloadSchema = z.object({
  sub: IdSchema, // user id
  email: z.string().email(),
  username: z.string(),
  iat: z.number(),
  exp: z.number(),
});

// User profile
export const UserProfileSchema = z.object({
  id: IdSchema,
  email: z.string().email(),
  username: z.string(),
  createdAt: StringTimestampSchema,
  lastLoginAt: StringTimestampSchema.optional(),
});

// Session
export const SessionSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  expiresAt: StringTimestampSchema,
  createdAt: StringTimestampSchema,
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type Session = z.infer<typeof SessionSchema>;
