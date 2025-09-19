import { prisma } from '../prisma';
import { logger } from '../logger';
import { downloadMediaFile } from './downloadMediaFile';

/**
 * Helper function to download media and update database
 */
export async function downloadMedia(mediaId: string, url: string): Promise<string | null> {
  try {
    const existingMedia = await prisma.media.findUnique({
      where: { id: mediaId },
      include: { downloadResult: true },
    });
    
    if (existingMedia?.localPath) {
      return existingMedia.localPath;
    }
    
    const downloadResult = await prisma.mediaDownloadResult.upsert({
      where: { mediaId },
      update: {
        status: 'downloading',
        updatedAt: new Date(),
      },
      create: {
        mediaId,
        status: 'downloading',
      },
    });
    
    const localPath = await downloadMediaFile(url, mediaId);
    
    await prisma.media.update({
      where: { id: mediaId },
      data: {
        localPath,
      },
    });
    
    await prisma.mediaDownloadResult.update({
      where: { id: downloadResult.id },
      data: {
        status: 'success',
        localPath,
        downloadedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    logger.info({ mediaId, localPath }, 'Media downloaded successfully');
    return localPath;
    
  } catch (error) {
    logger.error({ err: error, mediaId, url }, 'Failed to download media');
    
    await prisma.mediaDownloadResult.upsert({
      where: { mediaId },
      update: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date(),
      },
      create: {
        mediaId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    
    return null;
  }
}
