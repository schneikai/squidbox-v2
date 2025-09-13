import type { MediaUploadResult, UploadMediaRequest } from './types';

/**
 * Upload media to Twitter
 */
export const uploadMediaToTwitter = async (
  accessToken: string,
  request: UploadMediaRequest,
): Promise<MediaUploadResult> => {
  // Convert Buffer to Blob if needed
  let fileToUpload: File | Blob;
  if (Buffer.isBuffer(request.file)) {
    fileToUpload = new Blob([new Uint8Array(request.file)], { type: request.mediaType });
  } else {
    fileToUpload = request.file;
  }

  // First, initialize the upload
  const formData = new FormData();
  formData.append('media', fileToUpload);
  formData.append('media_category', request.mediaType.startsWith('video/') ? 'tweet_video' : 'tweet_image');

  const response = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Twitter media upload error:', errorText);
    throw new Error(`Media upload failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as { media_id_string: string };
  return {
    success: true,
    mediaId: data.media_id_string,
  };
};

/**
 * Upload image to Twitter (convenience function)
 */
export const uploadImageToTwitter = async (
  accessToken: string,
  imageFile: File | Blob | Buffer,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' = 'image/jpeg',
): Promise<MediaUploadResult> => {
  return uploadMediaToTwitter(accessToken, {
    file: imageFile,
    mediaType,
  });
};

/**
 * Upload video to Twitter (convenience function)
 */
export const uploadVideoToTwitter = async (
  accessToken: string,
  videoFile: File | Blob | Buffer,
): Promise<MediaUploadResult> => {
  return uploadMediaToTwitter(accessToken, {
    file: videoFile,
    mediaType: 'video/mp4',
  });
};
