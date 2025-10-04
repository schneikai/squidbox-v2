import { z } from 'zod';

// ============================================================================
// MEDIA DATABASE TYPES
// ============================================================================

export const MediaType = z.enum(['image', 'video']);
export type MediaType = z.infer<typeof MediaType>;

export const Media = z.object({
  id: z.string(),
  type: MediaType,
  url: z.string(),
  localPath: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Media = z.infer<typeof Media>;

export const PostMedia = z.object({
  id: z.string(),
  postId: z.string(),
  mediaId: z.string(),
  order: z.number(),
  createdAt: z.date(),
});
export type PostMedia = z.infer<typeof PostMedia>;

export const MediaDownloadResult = z.object({
  id: z.string(),
  mediaId: z.string(),
  status: z.enum(['pending', 'working', 'success', 'failed']),
  statusText: z.string().nullable(),
  jobId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type MediaDownloadResult = z.infer<typeof MediaDownloadResult>;

// ============================================================================
// MEDIA API TYPES
// ============================================================================

// Media for list view (subset of Media without timestamps)
export const MediaForList = Media.pick({
  id: true,
  type: true,
  url: true,
  localPath: true,
});

// Media with download status for detail view
export const MediaWithStatus = Media.pick({
  id: true,
  type: true,
  url: true,
  localPath: true,
}).extend({
  downloadStatus: z.enum(['pending', 'working', 'success', 'failed']),
  downloadError: z.string().nullable(),
});
