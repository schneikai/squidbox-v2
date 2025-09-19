import { z } from 'zod';

// ============================================================================
// CORE TYPES
// ============================================================================

export const Platform = z.enum(['twitter', 'bluesky', 'onlyfans', 'jff']);
export type Platform = z.infer<typeof Platform>;

export const Media = z.object({
  type: z.enum(['image', 'video']),
  url: z.url(),
  localPath: z.string().optional(),
});
export type Media = z.infer<typeof Media>;

export const Post = z.object({
  text: z.string().min(1, 'Text cannot be empty'),
  media: z.array(Media),
});
export type Post = z.infer<typeof Post>;

// ============================================================================
// COMPOSED TYPES
// ============================================================================

export const PlatformPost = z.object({
  platform: Platform,
  post: Post,
  replyToId: z.string().optional(),
});
export type PlatformPost = z.infer<typeof PlatformPost>;

export const PostGroup = z.object({
  platforms: z.array(Platform),
  posts: z.array(Post),
});
export type PostGroup = z.infer<typeof PostGroup>;

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export const CreatePostRequest = z.object({
  postGroups: z.array(PostGroup).min(1, 'At least one platform group must be provided'),
});
export type CreatePostRequest = z.infer<typeof CreatePostRequest>;

export const PostResult = z.object({
  platform: Platform,
  success: z.boolean(),
  platformPostId: z.string().optional(),
  error: z.string().optional(),
});
export type PostResult = z.infer<typeof PostResult>;

export const CreatePostResponse = z.object({
  id: z.string(),
  status: z.enum(['pending', 'success', 'partial', 'failed']),
  platformResults: z.array(PostResult),
  createdAt: z.string(),
});
export type CreatePostResponse = z.infer<typeof CreatePostResponse>;

// ============================================================================
// FRONTEND COMPOSER TYPES
// ============================================================================

export const PlatformComposerData = z.object({
  postGroups: z.array(PostGroup),
});
export type PlatformComposerData = z.infer<typeof PlatformComposerData>;

// ============================================================================
// OAUTH TYPES
// ============================================================================

export const OAuthTokensCreate = z.object({
  platform: Platform,
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().optional(),
  expiresIn: z.number().positive('Expires in must be a positive number'),
  username: z.string().min(1, 'Username is required'),
  platformUserId: z.string().min(1, 'Platform user ID is required'),
});
export type OAuthTokensCreate = z.infer<typeof OAuthTokensCreate>;