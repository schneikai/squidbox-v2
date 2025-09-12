import { z } from 'zod';

// Twitter API response types
export const TwitterPostResult = z.object({
  success: z.boolean(),
  tweetId: z.string().optional(),
  error: z.string().optional(),
  errorType: z.enum(['rate_limit', 'unauthorized', 'other']).optional(),
});

export const TwitterUser = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  profile_image_url: z.string().optional(),
  public_metrics: z.object({
    followers_count: z.number(),
    following_count: z.number(),
    tweet_count: z.number(),
  }).optional(),
});

export const MediaUploadResult = z.object({
  success: z.boolean(),
  mediaId: z.string().optional(),
  error: z.string().optional(),
});

export const TwitterAuthTokens = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresIn: z.number().optional(),
  tokenType: z.string().default('bearer'),
});

// Type exports
export type TwitterPostResult = z.infer<typeof TwitterPostResult>;
export type TwitterUser = z.infer<typeof TwitterUser>;
export type MediaUploadResult = z.infer<typeof MediaUploadResult>;
export type TwitterAuthTokens = z.infer<typeof TwitterAuthTokens>;

// Request types
export interface CreateTweetRequest {
  text: string;
  mediaIds?: string[];
  replyToTweetId?: string;
}

export interface UploadMediaRequest {
  file: File | Blob | Buffer;
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'video/mp4';
}
