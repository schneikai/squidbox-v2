import ComposeTemplate from '@/components/templates/ComposeTemplate';
import { usePostSubmission } from '@/hooks/usePostSubmission';
import type { PlatformPosts } from '@/types/post';
import React, { useCallback } from 'react';
import { Alert } from 'react-native';

export default function ComposeTab() {
  const { submitPost, isSubmitting, error } = usePostSubmission();

  const handlePost = useCallback(
    async (platformPosts: readonly PlatformPosts[]) => {
      const result = await submitPost(platformPosts);

      if (error) {
        Alert.alert('Error', error);
        return;
      }

      Alert.alert('Success', `Post submitted successfully!`, [{ text: 'OK' }]);
    },
    [submitPost, error],
  );

  return <ComposeTemplate userAvatarUri={undefined} onPost={handlePost} />;
}
