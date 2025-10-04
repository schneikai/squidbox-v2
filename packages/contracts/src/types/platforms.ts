import { z } from 'zod';

// ============================================================================
// PLATFORMS DATABASE TYPES
// ============================================================================

export const Platform = z.enum(['twitter', 'bluesky', 'onlyfans', 'jff']);
export type Platform = z.infer<typeof Platform>;

export const OAuthToken = z.object({
  id: z.string(),
  userId: z.string(),
  platform: Platform,
  accessToken: z.string(),
  refreshToken: z.string().nullable(),
  expiresIn: z.number(),
  expiresAt: z.date().nullable(),
  username: z.string(),
  platformUserId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type OAuthToken = z.infer<typeof OAuthToken>;

export const PlatformCredentials = z.object({
  id: z.string(),
  userId: z.string(),
  platform: Platform,
  username: z.string(),
  password: z.string(),
  totpSecret: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type PlatformCredentials = z.infer<typeof PlatformCredentials>;

// ============================================================================
// PLATFORMS API TYPES
// ============================================================================

// Platform credentials routes
export const PlatformCredentialsCreateRequest = z.object({
  platform: Platform,
  username: z.string().min(1),
  password: z.string().min(1),
  totpSecret: z.string().optional(),
});
export type PlatformCredentialsCreateRequest = z.infer<typeof PlatformCredentialsCreateRequest>;

// Note: PlatformCredentialsCreate was removed - use PlatformCredentialsCreateRequest

export const PlatformCredentialsResponse = z.object({
  platform: Platform,
  username: z.string(),
  hasTotp: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PlatformCredentialsResponse = z.infer<typeof PlatformCredentialsResponse>;

// OAuth tokens routes
export const OAuthTokensCreateRequest = z.object({
  platform: Platform,
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresIn: z.number().positive(),
  username: z.string().min(1),
  platformUserId: z.string().min(1),
});
export type OAuthTokensCreateRequest = z.infer<typeof OAuthTokensCreateRequest>;

// Note: OAuthTokensCreate was removed - use OAuthTokensCreateRequest

export const OAuthTokenResponse = z.object({
  platform: Platform,
  username: z.string(),
  platformUserId: z.string(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OAuthTokenResponse = z.infer<typeof OAuthTokenResponse>;

// Platform status routes
export const PlatformStatusResponse = z.object({
  platform: Platform,
  connected: z.boolean(),
  username: z.string().optional(),
  expiresAt: z.string().optional(),
  hasCredentials: z.boolean(),
});
export type PlatformStatusResponse = z.infer<typeof PlatformStatusResponse>;

// ============================================================================
// PLATFORM CONFIGURATION
// ============================================================================

export type PlatformConfig = Readonly<{
  id: Platform;
  name: string;
  icon: string;
  color: string;
  characterLimit: number;
  maxMedia: number;
  supportsVideo: boolean;
  supportsMultiplePosts: boolean;
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
