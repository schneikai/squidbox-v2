import { useTheme } from '@rneui/themed';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { getPosts } from '@/services/backend';
import type { ApiError } from '@/services/http';
import type { PostListItem, PostsListResponse } from '@squidbox/contracts';

import PostCard from '../molecules/PostCard';
import EmptyState from '../atoms/EmptyState';

export default function PostsList() {
  const { theme } = useTheme();
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      setError(null);
      const response = await getPosts(pageNum, 20);

      if (response.data) {
        const newPosts = response.data.posts;
        
        if (isRefresh || pageNum === 1) {
          setPosts(newPosts);
        } else {
          setPosts(prev => [...prev, ...newPosts]);
        }
        
        setHasMore(pageNum < response.data.pagination.totalPages);
        setPage(pageNum);
      } else {
        setError('Failed to load posts');
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load posts');
      console.error('Posts fetch error:', apiError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchPosts(1, true);
  }, [fetchPosts]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPosts(page + 1, false);
    }
  }, [loading, hasMore, page, fetchPosts]);

  const handlePostPress = useCallback((postId: string) => {
    router.push(`/(tabs)/posts/${postId}`);
  }, []);

  useEffect(() => {
    fetchPosts(1, false);
  }, [fetchPosts]);

  const renderPost = useCallback(({ item }: { item: PostListItem }) => (
    <PostCard
      post={item}
      onPress={() => handlePostPress(item.id)}
    />
  ), [handlePostPress]);

  const renderFooter = useCallback(() => {
    if (!loading || posts.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }, [loading, posts.length, theme.colors.primary]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <EmptyState
        icon="file-text"
        title="No posts yet"
        description="Your posts will appear here once you start creating them."
      />
    );
  }, [loading]);

  if (loading && posts.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
});
