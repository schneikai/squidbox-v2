import { createOAuthHeader } from './oauth1';

export interface MediaUploadResult {
  mediaId: string;
  mediaType: 'image' | 'video';
}

/**
 * Upload image to Twitter using OAuth 1.0a
 */
export const uploadImageToTwitter = async (imageUri: string): Promise<MediaUploadResult> => {
  console.log('Starting OAuth 1.0a image upload...');

  // Convert image to base64
  const response = await fetch(imageUri);
  const blob = await response.blob();

  // Convert blob to base64
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix if present
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      resolve(base64Data);
    };
  });

  reader.readAsDataURL(blob);
  const base64Data = await base64Promise;

  // Prepare form data for OAuth 1.0a
  const mediaData = `data:${blob.type};base64,${base64Data}`;

  const url = 'https://upload.twitter.com/1.1/media/upload.json';
  const method = 'POST';

  // Create OAuth 1.0a header
  const authHeader = createOAuthHeader(method, url);

  // Create form data
  const formData = new FormData();
  formData.append('media_data', base64Data);

  console.log('Uploading image with OAuth 1.0a...');

  const uploadResponse = await fetch(url, {
    method: method,
    headers: {
      Authorization: authHeader,
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('Image upload error:', errorText);
    throw new Error(`Image upload failed: ${uploadResponse.status} - ${errorText}`);
  }

  const uploadData = await uploadResponse.json();
  console.log('Image upload successful:', uploadData);

  return {
    mediaId: uploadData.media_id_string,
    mediaType: 'image',
  };
};

/**
 * Upload video to Twitter using OAuth 1.0a
 * Videos require chunked upload for files larger than 5MB
 */
export const uploadVideoToTwitter = async (videoUri: string): Promise<MediaUploadResult> => {
  console.log('Starting OAuth 1.0a video upload...');

  // Convert video to base64
  const response = await fetch(videoUri);
  const blob = await response.blob();

  // Convert blob to base64
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix if present
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      resolve(base64Data);
    };
  });

  reader.readAsDataURL(blob);
  const base64Data = await base64Promise;

  const url = 'https://upload.twitter.com/1.1/media/upload.json';
  const method = 'POST';

  // Create OAuth 1.0a header
  const authHeader = createOAuthHeader(method, url);

  // Create form data for video upload
  const formData = new FormData();
  formData.append('media_data', base64Data);
  formData.append('media_category', 'tweet_video');

  console.log('Uploading video with OAuth 1.0a...');

  const uploadResponse = await fetch(url, {
    method: method,
    headers: {
      Authorization: authHeader,
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('Video upload error:', errorText);
    throw new Error(`Video upload failed: ${uploadResponse.status} - ${errorText}`);
  }

  const uploadData = await uploadResponse.json();
  console.log('Video upload successful:', uploadData);

  return {
    mediaId: uploadData.media_id_string,
    mediaType: 'video',
  };
};

/**
 * Upload media (image or video) to Twitter using OAuth 1.0a
 * Automatically detects media type and uses appropriate upload method
 */
export const uploadMediaToTwitter = async (mediaUri: string): Promise<MediaUploadResult> => {
  console.log('Starting OAuth 1.0a media upload...');

  // Convert media to base64
  const response = await fetch(mediaUri);
  const blob = await response.blob();

  // Determine media type
  const isVideo = blob.type.startsWith('video/');
  const mediaType = isVideo ? 'video' : 'image';

  console.log(`Detected media type: ${mediaType} (${blob.type})`);

  // Convert blob to base64
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix if present
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      resolve(base64Data);
    };
  });

  reader.readAsDataURL(blob);
  const base64Data = await base64Promise;

  const url = 'https://upload.twitter.com/1.1/media/upload.json';
  const method = 'POST';

  // Create OAuth 1.0a header
  const authHeader = createOAuthHeader(method, url);

  // Create form data
  const formData = new FormData();
  formData.append('media_data', base64Data);

  // Add media category for videos
  if (isVideo) {
    formData.append('media_category', 'tweet_video');
  }

  console.log(`Uploading ${mediaType} with OAuth 1.0a...`);

  const uploadResponse = await fetch(url, {
    method: method,
    headers: {
      Authorization: authHeader,
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error(`${mediaType} upload error:`, errorText);
    throw new Error(`${mediaType} upload failed: ${uploadResponse.status} - ${errorText}`);
  }

  const uploadData = await uploadResponse.json();
  console.log(`${mediaType} upload successful:`, uploadData);

  return {
    mediaId: uploadData.media_id_string,
    mediaType,
  };
};
