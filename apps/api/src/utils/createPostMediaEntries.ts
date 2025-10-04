import { getPrisma } from '../prisma';
import { PlatformPost } from '../types.js';

/**
 * Helper function to create or find media items and link them to a post (without downloading)
 */
export async function createPostMediaEntries(postId: string, mediaItems: PlatformPost['post']['media']) {
  const postMedia = [];
  
  for (let i = 0; i < mediaItems.length; i++) {
    const mediaItem = mediaItems[i];
    
    if (!mediaItem) continue;
    
    // Create or find the media item
    const media = await getPrisma().media.upsert({
      where: { url: mediaItem.url },
      update: {},
      create: {
        type: mediaItem.type,
        url: mediaItem.url,
      },
    });

    postMedia.push(media);
    
    // Create the post-media link (idempotent per postId+mediaId)
    await getPrisma().postMedia.upsert({
      where: { postId_mediaId: { postId, mediaId: media.id } },
      update: {},
      create: {
        postId,
        mediaId: media.id,
        order: i,
      },
    });
  }
  
  return postMedia;
}
