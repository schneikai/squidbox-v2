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
  url: z.url(),
  alt: z.string().optional(),
  id: z.string(), // Local identifier for React keys (frontend only)
  uri: z.string(), // Local file URI (frontend only)
});
export type MediaItem = z.infer<typeof MediaItem>;

// Post types
export const Post = z.object({
  text: z.string().min(1, "Text cannot be empty"),
  media: z.array(MediaItem),
});
export type Post = z.infer<typeof Post>;

export const PostList = z.array(Post);
export type PostList = z.infer<typeof PostList>;

export const PlatformPosts = z.object({
  platforms: z.array(Platform),
  posts: PostList,
});
export type PlatformPosts = z.infer<typeof PlatformPosts>;

export const PlatformComposerData = z.object({
  platformPosts: z.array(PlatformPosts),
});
export type PlatformComposerData = z.infer<typeof PlatformComposerData>;

export const CreatePostRequest = z.object({
  platformPosts: z.array(PlatformPosts).min(1),
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


