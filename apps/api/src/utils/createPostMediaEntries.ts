import { prisma } from '../prisma';
import { Media } from '@squidbox/contracts';

/**
 * Helper function to create or find media items and link them to a post (without downloading)
 */
export async function createPostMediaEntries(postId: string, mediaItems: Media[]) {
  const postMediaLinks = [];
  
  for (let i = 0; i < mediaItems.length; i++) {
    const mediaItem = mediaItems[i];
    
    if (!mediaItem) continue;
    
    // Create or find the media item
    const media = await prisma.media.upsert({
      where: { url: mediaItem.url },
      update: {},
      create: {
        type: mediaItem.type,
        url: mediaItem.url,
      },
    });
    
    // Create the post-media link (idempotent per postId+mediaId)
    const postMedia = await prisma.postMedia.upsert({
      where: { postId_mediaId: { postId, mediaId: media.id } },
      update: {},
      create: {
        postId,
        mediaId: media.id,
        order: i,
      },
    });
    
    postMediaLinks.push({ postMedia, media });
  }
  
  return postMediaLinks;
}
