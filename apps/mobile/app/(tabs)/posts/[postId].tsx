import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import PostDetail from '@/components/templates/PostDetail';

export default function PostDetailPage() {
  const { postId } = useLocalSearchParams<{ postId: string }>();

  if (!postId) {
    return null;
  }

  return <PostDetail postId={postId} />;
}
