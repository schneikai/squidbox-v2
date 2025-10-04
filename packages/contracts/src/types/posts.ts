import { z } from 'zod';
import { Platform } from './platforms';
import { MediaType, Media, PostMedia, MediaDownloadResult, MediaForList, MediaWithStatus } from './media';

// ============================================================================
// POSTS DATABASE TYPES
// ============================================================================

export const PostStatus = z.enum(['pending', 'success', 'failed']);
export type PostStatus = z.infer<typeof PostStatus>;

export const JobStatus = z.enum(['pending', 'working', 'success', 'failed']);
export type JobStatus = z.infer<typeof JobStatus>;


export const Post = z.object({
  id: z.string(),
  userId: z.string(),
  platform: Platform,
  text: z.string(),
  status: PostStatus,
  groupId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Post = z.infer<typeof Post>;


export const PostResult = z.object({
  id: z.string(),
  postId: z.string(),
  status: JobStatus,
  statusText: z.string().nullable(),
  platformPostId: z.string().nullable(),
  jobId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type PostResult = z.infer<typeof PostResult>;

// ============================================================================
// POSTS API TYPES
// ============================================================================

export const CreatePostRequest = z.object({
  postGroups: z.array(z.object({
    platforms: z.array(Platform),
    posts: z.array(z.object({
      text: z.string().min(1),
      media: z.array(z.object({
        type: MediaType,
        url: z.string().url(),
        localPath: z.string().optional(),
      })),
    })),
  })),
});
export type CreatePostRequest = z.infer<typeof CreatePostRequest>;

export const CreatePostResponse = z.object({
  id: z.string(),
  status: PostStatus,
  platformResults: z.array(z.object({
    platform: Platform,
    success: z.boolean(),
    platformPostId: z.string().optional(),
    error: z.string().optional(),
  })),
  groupId: z.string(),
  createdAt: z.string(),
});
export type CreatePostResponse = z.infer<typeof CreatePostResponse>;


// Database result formatted for API responses
export const PostResultResponse = PostResult.pick({
  id: true,
  status: true,
  statusText: true,
  platformPostId: true,
}).extend({
  createdAt: z.string(), // Convert date to string for API
});
export type PostResultResponse = z.infer<typeof PostResultResponse>;

// Provider response result (what platform providers return)
export const PlatformResult = z.object({
  platform: Platform,
  success: z.boolean(),
  platformPostId: z.string().optional(),
  error: z.string().optional(),
});
export type PlatformResult = z.infer<typeof PlatformResult>;

export const PostListItem = Post.pick({
  id: true,
  platform: true,
  text: true,
  status: true,
  groupId: true,
}).extend({
  createdAt: z.string(), // Convert date to string for API
  updatedAt: z.string(), // Convert date to string for API
  media: z.array(MediaForList),
  postResult: PostResultResponse.nullable(),
});
export type PostListItem = z.infer<typeof PostListItem>;

export const PostsListResponse = z.object({
  posts: z.array(PostListItem),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
export type PostsListResponse = z.infer<typeof PostsListResponse>;


export const PostDetailResponse = Post.pick({
  id: true,
  platform: true,
  text: true,
  status: true,
  groupId: true,
}).extend({
  createdAt: z.string(), // Convert date to string for API
  updatedAt: z.string(), // Convert date to string for API
  media: z.array(MediaWithStatus),
  postResults: z.array(PostResultResponse),
});
export type PostDetailResponse = z.infer<typeof PostDetailResponse>;

// PlatformPost moved to API package (apps/api/src/types.ts)
