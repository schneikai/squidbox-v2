import { createPost, type CreatePostRequest, type CreatePostResponse } from '@/services/backend';
import type { ApiError } from '@/services/http';
import type { PlatformPosts } from '@/types/post';
import { useCallback, useState } from 'react';

type PostSubmissionState = Readonly<{
  isSubmitting: boolean;
  error: string | null;
}>;

type PostSubmissionActions = Readonly<{
  submitPost: (platformPosts: readonly PlatformPosts[]) => Promise<CreatePostResponse | null>;
}>;

export function usePostSubmission(): PostSubmissionState & PostSubmissionActions {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitPost = useCallback(
    async (platformPosts: readonly PlatformPosts[]): Promise<CreatePostResponse | null> => {
      if (isSubmitting) {
        return null;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const platformPostsToSend: CreatePostRequest['platformPosts'] = platformPosts.flatMap(
          (group) =>
            group.platforms.flatMap((platform) =>
              group.posts.map((post) => ({
                platform,
                text: post.text,
                media: post.media.map((m) => ({ type: m.type, url: m.uri })),
              })),
            ),
        );

        const requestData: CreatePostRequest = {
          platformPosts: platformPostsToSend,
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
