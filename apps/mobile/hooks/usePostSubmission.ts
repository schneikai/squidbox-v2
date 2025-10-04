import { createPost, type CreatePostRequest, type CreatePostResponse } from '@/services/backend';
import type { ApiError } from '@/services/http';
import type { PostGroup } from '@/types';
import { useCallback, useState } from 'react';

type PostSubmissionState = Readonly<{
  isSubmitting: boolean;
  error: string | null;
}>;

type PostSubmissionActions = Readonly<{
  submitPost: (postGroups: readonly PostGroup[]) => Promise<CreatePostResponse | null>;
}>;

export function usePostSubmission(): PostSubmissionState & PostSubmissionActions {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitPost = useCallback(
    async (postGroups: readonly PostGroup[]): Promise<CreatePostResponse | null> => {
      if (isSubmitting) {
        return null;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const processedPostGroups: PostGroup[] = postGroups.map(group => ({
          platforms: group.platforms,
          posts: group.posts.map(post => ({
            text: post.text,
            media: post.media.map(mediaItem => ({
              type: mediaItem.type,
              url: mediaItem.type === 'video' 
                ? process.env.EXPO_PUBLIC_S3_VIDEO_URL || ''
                : process.env.EXPO_PUBLIC_S3_IMAGE_URL || '',
              localPath: mediaItem.localPath,
            }))
          }))
        }));

        const requestData: CreatePostRequest = {
          postGroups: processedPostGroups as CreatePostRequest['postGroups'], // Cast to mutable type
        };

        const response = await createPost(requestData);
        return response.data;
      } catch (err) {
        const apiError = err as ApiError;
        const errorMessage = apiError.message || 'Failed to submit post';
        setError(errorMessage);
        console.error('Post submission error:', apiError);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting],
  );

  return {
    isSubmitting,
    error,
    submitPost,
  };
}
