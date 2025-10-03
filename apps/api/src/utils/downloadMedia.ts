import { getPrisma } from '../prisma';
import { logger } from '../logger';
import { downloadMediaFile } from './downloadMediaFile';

/**
 * Helper function to download media and update database
 */
export async function downloadMedia(mediaId: string, url: string): Promise<string | null> {
  const existingMedia = await getPrisma().media.findUnique({
    where: { id: mediaId },
    include: { downloadResult: true },
  });
  
  if (existingMedia?.localPath) {
    return existingMedia.localPath;
  }
  
    const downloadResult = await getPrisma().mediaDownloadResult.upsert({
      where: { mediaId },
      update: {
        status: 'working',
        statusText: 'Downloading...',
        updatedAt: new Date(),
      },
      create: {
        mediaId,
        status: 'working',
        statusText: 'Downloading...',
      },
    });

  try {
    const localPath = await downloadMediaFile(url, mediaId);
    
    await getPrisma().media.update({
      where: { id: mediaId },
      data: {
        localPath,
      },
    });
    
    await getPrisma().mediaDownloadResult.update({
      where: { id: downloadResult.id },
      data: {
        status: 'success',
        statusText: 'Download completed',
        updatedAt: new Date(),
      },
    });
    
    logger.info({ mediaId, localPath }, 'Media downloaded successfully');
    return localPath;
    
  } catch (error) {
    logger.error({ err: error, mediaId, url }, 'Failed to download media');
    
    await getPrisma().mediaDownloadResult.upsert({
      where: { mediaId },
      update: {
        status: 'failed',
        statusText: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date(),
      },
      create: {
        mediaId,
        status: 'failed',
        statusText: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    
    throw error;
  }
}
