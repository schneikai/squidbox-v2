import { prisma } from '../prisma';
import { downloadMedia } from './downloadMedia';

/**
 * Helper function to download all media for a post
 */
export async function downloadPostMedia(postId: string) {
  const postMedia = await prisma.postMedia.findMany({
    where: { postId },
    include: { media: true },
    orderBy: { order: 'asc' },
  });
  
  const downloadPromises = postMedia.map(pm => 
    downloadMedia(pm.media.id, pm.media.url)
  );
  
  await Promise.all(downloadPromises);
}
