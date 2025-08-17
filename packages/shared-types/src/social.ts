import { z } from 'zod';
import { IdSchema, TimestampSchema, PaginationSchema } from './common';

// Chat Channel Schema
export const ChatChannelSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  type: z.enum(['global', 'world', 'guild', 'party', 'direct', 'trade', 'help']),
  worldId: IdSchema.optional(), // for world-specific channels
  guildId: IdSchema.optional(), // for guild channels
  isPublic: z.boolean().default(true),
  maxMembers: z.number().int().min(1).optional(),
  createdBy: IdSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  isActive: z.boolean().default(true)
});

// Chat Message Schema
export const ChatMessageSchema = z.object({
  id: IdSchema,
  channelId: IdSchema,
  userId: IdSchema,
  content: z.string().min(1).max(2000),
  type: z.enum(['text', 'system', 'action', 'trade', 'whisper']).default('text'),
  replyToId: IdSchema.optional(),
  mentionedUsers: z.array(IdSchema).default([]),
  attachments: z.array(z.object({
    type: z.enum(['image', 'file', 'item_link']),
    url: z.string().url().optional(),
    itemId: IdSchema.optional(),
    metadata: z.record(z.string(), z.any()).default({})
  })).default([]),
  editedAt: TimestampSchema.optional(),
  deletedAt: TimestampSchema.optional(),
  createdAt: TimestampSchema
});

// Chat Member Schema
export const ChatMemberSchema = z.object({
  channelId: IdSchema,
  userId: IdSchema,
  role: z.enum(['member', 'moderator', 'admin']).default('member'),
  joinedAt: TimestampSchema,
  lastReadAt: TimestampSchema.optional(),
  isMuted: z.boolean().default(false),
  mutedUntil: TimestampSchema.optional()
});

// Guild Schema
export const GuildSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  tag: z.string().min(2).max(6).regex(/^[A-Z0-9]+$/),
  logo: z.string().url().optional(),
  ownerId: IdSchema,
  memberCount: z.number().int().min(0).default(0),
  maxMembers: z.number().int().min(1).default(50),
  level: z.number().int().min(1).default(1),
  experience: z.number().int().min(0).default(0),
  isPublic: z.boolean().default(true),
  requiresApproval: z.boolean().default(false),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

// Guild Member Schema
export const GuildMemberSchema = z.object({
  guildId: IdSchema,
  userId: IdSchema,
  role: z.enum(['member', 'officer', 'leader']).default('member'),
  joinedAt: TimestampSchema,
  contributionPoints: z.number().int().min(0).default(0),
  lastActiveAt: TimestampSchema.optional(),
  permissions: z.array(z.string()).default([])
});

// Moderation Schema
export const ReportSchema = z.object({
  id: IdSchema,
  reporterUserId: IdSchema,
  targetType: z.enum(['user', 'message', 'guild', 'world']),
  targetId: IdSchema,
  reason: z.enum(['spam', 'harassment', 'inappropriate_content', 'cheating', 'other']),
  description: z.string().max(1000).optional(),
  status: z.enum(['pending', 'investigating', 'resolved', 'dismissed']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assignedTo: IdSchema.optional(),
  resolution: z.string().max(1000).optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  resolvedAt: TimestampSchema.optional()
});

export const ModerationActionSchema = z.object({
  id: IdSchema,
  moderatorUserId: IdSchema,
  targetUserId: IdSchema,
  action: z.enum(['warn', 'mute', 'kick', 'ban', 'unban']),
  reason: z.string().max(500),
  duration: z.number().int().min(0).optional(), // seconds, null for permanent
  expiresAt: TimestampSchema.optional(),
  reportId: IdSchema.optional(),
  createdAt: TimestampSchema
});

// Friend/Block Schema
export const FriendRequestSchema = z.object({
  id: IdSchema,
  fromUserId: IdSchema,
  toUserId: IdSchema,
  status: z.enum(['pending', 'accepted', 'declined']).default('pending'),
  message: z.string().max(200).optional(),
  createdAt: TimestampSchema,
  respondedAt: TimestampSchema.optional()
});

export const FriendshipSchema = z.object({
  id: IdSchema,
  user1Id: IdSchema,
  user2Id: IdSchema,
  createdAt: TimestampSchema
});

export const BlockedUserSchema = z.object({
  id: IdSchema,
  blockerUserId: IdSchema,
  blockedUserId: IdSchema,
  reason: z.string().max(200).optional(),
  createdAt: TimestampSchema
});

// API Schemas
export const SendMessageRequestSchema = z.object({
  channelId: IdSchema,
  content: z.string().min(1).max(2000),
  type: ChatMessageSchema.shape.type.optional(),
  replyToId: IdSchema.optional()
});

export const CreateChannelRequestSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  type: ChatChannelSchema.shape.type,
  worldId: IdSchema.optional(),
  isPublic: z.boolean().default(true),
  maxMembers: z.number().int().min(1).optional()
});

export const JoinChannelRequestSchema = z.object({
  channelId: IdSchema
});

export const CreateGuildRequestSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  tag: GuildSchema.shape.tag,
  isPublic: z.boolean().default(true),
  requiresApproval: z.boolean().default(false)
});

export const InviteToGuildRequestSchema = z.object({
  guildId: IdSchema,
  userId: IdSchema,
  message: z.string().max(200).optional()
});

export const CreateReportRequestSchema = z.object({
  targetType: ReportSchema.shape.targetType,
  targetId: IdSchema,
  reason: ReportSchema.shape.reason,
  description: z.string().max(1000).optional()
});

export const ChatHistoryResponseSchema = z.object({
  messages: z.array(ChatMessageSchema.extend({
    user: z.object({
      id: IdSchema,
      username: z.string(),
      displayName: z.string(),
      avatar: z.string().url().optional()
    }),
    mentions: z.array(z.object({
      id: IdSchema,
      username: z.string(),
      displayName: z.string()
    })).default([])
  })),
  pagination: PaginationSchema
});

// Types
export type ChatChannel = z.infer<typeof ChatChannelSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatMember = z.infer<typeof ChatMemberSchema>;
export type Guild = z.infer<typeof GuildSchema>;
export type GuildMember = z.infer<typeof GuildMemberSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type ModerationAction = z.infer<typeof ModerationActionSchema>;
export type FriendRequest = z.infer<typeof FriendRequestSchema>;
export type Friendship = z.infer<typeof FriendshipSchema>;
export type BlockedUser = z.infer<typeof BlockedUserSchema>;

export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export type CreateChannelRequest = z.infer<typeof CreateChannelRequestSchema>;
export type JoinChannelRequest = z.infer<typeof JoinChannelRequestSchema>;
export type CreateGuildRequest = z.infer<typeof CreateGuildRequestSchema>;
export type InviteToGuildRequest = z.infer<typeof InviteToGuildRequestSchema>;
export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>;
export type ChatHistoryResponse = z.infer<typeof ChatHistoryResponseSchema>;