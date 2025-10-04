import ComposeTemplate from '@/components/templates/ComposeTemplate';
import { usePostSubmission } from '@/hooks/usePostSubmission';
import type { PostGroup } from '@/types';
import React, { useCallback } from 'react';
import { Alert } from 'react-native';

export default function ComposeTab() {
  const { submitPost, error } = usePostSubmission();

  const handlePost = useCallback(
    async (postGroups: readonly PostGroup[]) => {
      await submitPost(postGroups);

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
