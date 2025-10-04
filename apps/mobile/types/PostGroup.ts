import { z } from 'zod';
import { Platform, MediaType, Media } from '@squidbox/contracts';

// ============================================================================
// MOBILE-SPECIFIC TYPES
// ============================================================================

// Frontend composer types
export const PostWithMedia = z.object({
  text: z.string().min(1, 'Text cannot be empty'),
  media: z.array(z.object({
    type: MediaType,
    url: z.url(),
    localPath: z.string().optional(),
  })),
});
export type PostWithMedia = z.infer<typeof PostWithMedia>;

export const PostGroup = z.object({
  platforms: z.array(Platform),
  posts: z.array(PostWithMedia),
});
export type PostGroup = z.infer<typeof PostGroup>;

// Media input type for forms
export const MediaInput = Media.pick({
  type: true,
  url: true,
  localPath: true,
}).extend({
  url: z.url(), // More strict URL validation for input
  localPath: z.string().optional(), // Optional for input
});
export type MediaInput = z.infer<typeof MediaInput>;
