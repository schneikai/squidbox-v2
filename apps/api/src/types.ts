import { z } from 'zod';
import { Platform, MediaType } from '@squidbox/contracts';

// ============================================================================
// API-SPECIFIC TYPES
// ============================================================================

// Platform post for API processing (used by platform providers)
export const PlatformPost = z.object({
  platform: Platform,
  post: z.object({
    text: z.string().min(1, 'Text cannot be empty'),
    media: z.array(z.object({
      type: MediaType,
      url: z.url(),
      localPath: z.string().optional(),
    })),
  }),
  replyToId: z.string().optional(),
});
export type PlatformPost = z.infer<typeof PlatformPost>;
