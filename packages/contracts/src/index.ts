import { z } from 'zod';

export const Platform = z.enum(['twitter', 'bluesky', 'onlyfans', 'jff']);
export type Platform = z.infer<typeof Platform>;

// Platform configuration types and constants
export type PlatformConfig = Readonly<{
  id: Platform;
  name: string;
  icon: string;
  color: string;
  characterLimit: number;
  maxMedia: number;
  supportsVideo: boolean;
  supportsMultiplePosts: boolean;
  authUrl?: string;
}>;

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  twitter: {
    id: 'twitter',
    name: 'Twitter',
    icon: 'twitter',
    color: '#1DA1F2',
    characterLimit: 280,
    maxMedia: 4,
    supportsVideo: true,
    supportsMultiplePosts: true,
    authUrl: '/auth/twitter',
  },
  bluesky: {
    id: 'bluesky',
    name: 'Bluesky',
    icon: 'cloud',
    color: '#00A8E8',
    characterLimit: 300,
    maxMedia: 4,
    supportsVideo: true,
    supportsMultiplePosts: true,
  },
  onlyfans: {
    id: 'onlyfans',
    name: 'OnlyFans',
    icon: 'heart',
    color: '#00AFF0',
    characterLimit: 500,
    maxMedia: 10,
    supportsVideo: true,
    supportsMultiplePosts: false,
  },
  jff: {
    id: 'jff',
    name: 'JFF',
    icon: 'camera',
    color: '#FF6B6B',
    characterLimit: 1000,
    maxMedia: 20,
    supportsVideo: true,
    supportsMultiplePosts: false,
  },
} as const;

export const SUPPORTED_PLATFORMS = Object.values(PLATFORM_CONFIGS) as Readonly<PlatformConfig[]>;

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

// The post on a specific platform
export const PlatformPost = z.object({
  platform: Platform,
  post: Post,
  replyToId: z.string().optional(),
});
export type PlatformPost = z.infer<typeof PlatformPost>;

// A group of posts on different platforms
// This is the type the PlatformComposer uses
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

// ============================================================================
// PLATFORM CREDENTIALS TYPES
// ============================================================================

export const PlatformCredentialsCreate = z.object({
  platform: Platform,
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  totpSecret: z.string().optional(),
});
export type PlatformCredentialsCreate = z.infer<typeof PlatformCredentialsCreate>;

export const PlatformCredentialsResponse = z.object({
  platform: Platform,
  username: z.string(),
  hasTotp: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PlatformCredentialsResponse = z.infer<typeof PlatformCredentialsResponse>;