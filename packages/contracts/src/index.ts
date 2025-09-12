import { z } from "zod";

export const Platform = z.enum(["twitter", "bluesky", "onlyfans", "jff"]);
export type Platform = z.infer<typeof Platform>;

export const OAuthTokensCreate = z.object({
  platform: Platform,
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresIn: z.number().int().positive(),
  username: z.string().min(1),
  userId: z.string().min(1)
});
export type OAuthTokensCreate = z.infer<typeof OAuthTokensCreate>;

// Post-related schemas
export const MediaItem = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().url(),
  alt: z.string().optional(),
});
export type MediaItem = z.infer<typeof MediaItem>;

export const PlatformPost = z.object({
  platform: Platform,
  text: z.string().min(1).max(280), // Twitter's character limit
  media: z.array(MediaItem).optional(),
  replyToId: z.string().optional(),
});
export type PlatformPost = z.infer<typeof PlatformPost>;

export const CreatePostRequest = z.object({
  platformPosts: z.array(PlatformPost).min(1),
});
export type CreatePostRequest = z.infer<typeof CreatePostRequest>;

export const PostResult = z.object({
  platform: Platform,
  success: z.boolean(),
  postId: z.string().optional(),
  error: z.string().optional(),
});
export type PostResult = z.infer<typeof PostResult>;

export const CreatePostResponse = z.object({
  id: z.string(),
  status: z.enum(["success", "partial", "failed"]),
  platformResults: z.array(PostResult),
  createdAt: z.string(),
});
export type CreatePostResponse = z.infer<typeof CreatePostResponse>;

export const ApiSuccess = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ success: z.literal(true), message: z.string().optional(), data });
export const ApiError = z.object({ error: z.unknown() });


