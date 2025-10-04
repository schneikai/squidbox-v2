import { useTheme } from '@rneui/themed';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getPost } from '@/services/backend';
import type { ApiError } from '@/services/http';
import type { PostDetailResponse } from '@squidbox/contracts';

import Icon from '@/components/atoms/Icon';
import EmptyState from '@/components/atoms/EmptyState';

type PostDetailProps = {
  postId: string;
};

export default function PostDetail({ postId }: PostDetailProps) {
  const { theme } = useTheme();
  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPost = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPost(postId);
      
      console.log('fetchPost', response);
      
      if (response.data) {
        setPost(response.data);
      } else {
        setError('Failed to load post');
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load post');
      console.error('Post fetch error:', apiError);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return theme.colors.success;
      case 'failed':
        return theme.colors.error;
      case 'pending':
        return theme.colors.warning;
      default:
        return theme.colors.grey3;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return 'check-circle';
      case 'failed':
        return 'x-circle';
      case 'pending':
        return 'clock';
      default:
        return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <EmptyState
          icon="alert-circle"
          title="Post not found"
          description={error || 'This post could not be loaded.'}
        />
      </View>
    );
  }

  const statusColor = getStatusColor(post.status);
  const statusIcon = getStatusIcon(post.status);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
        <View style={styles.platformInfo}>
          <Icon 
            name={post.platform === 'twitter' ? 'twitter' : 'share-2'} 
            type="feather" 
            size={20} 
            color={theme.colors.primary} 
          />
          <Text style={[styles.platformText, { color: theme.colors.onSurface }]}>
            {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <Icon 
            name={statusIcon} 
            type="feather" 
            size={16} 
            color={statusColor} 
          />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {post.status}
          </Text>
        </View>
      </View>

      {/* Post Content */}
      <View style={styles.content}>
        <Text style={[styles.text, { color: theme.colors.onSurface }]}>
          {post.text}
        </Text>

        {/* Media */}
        {post.media.length > 0 && (
          <View style={styles.mediaSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Media ({post.media.length})
            </Text>
            {post.media.map((media, index) => (
              <View key={media.id} style={[styles.mediaItem, { borderColor: theme.colors.outline }]}>
                <View style={styles.mediaInfo}>
                  <Icon 
                    name={media.type === 'video' ? 'video' : 'image'} 
                    type="feather" 
                    size={16} 
                    color={theme.colors.primary} 
                  />
                  <Text style={[styles.mediaType, { color: theme.colors.onSurface }]}>
                    {media.type.charAt(0).toUpperCase() + media.type.slice(1)}
                  </Text>
                </View>
                <View style={styles.mediaStatus}>
                  <Icon 
                    name={media.downloadStatus === 'success' ? 'check' : 'clock'} 
                    type="feather" 
                    size={12} 
                    color={media.downloadStatus === 'success' ? theme.colors.success : theme.colors.warning} 
                  />
                  <Text style={[styles.mediaStatusText, { color: theme.colors.grey3 }]}>
                    {media.downloadStatus}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Post Results */}
        {post.postResults.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Post Results
            </Text>
            {post.postResults.map((result, index) => (
              <View key={result.id} style={[styles.resultItem, { borderColor: theme.colors.outline }]}>
                <View style={styles.resultHeader}>
                  <Icon 
                    name={getStatusIcon(result.status)} 
                    type="feather" 
                    size={14} 
                    color={getStatusColor(result.status)} 
                  />
                  <Text style={[styles.resultStatus, { color: getStatusColor(result.status) }]}>
                    {result.status}
                  </Text>
                  <Text style={[styles.resultDate, { color: theme.colors.grey3 }]}>
                    {formatDate(result.createdAt)}
                  </Text>
                </View>
                {result.statusText && (
                  <Text style={[styles.resultText, { color: theme.colors.onSurface }]}>
                    {result.statusText}
                  </Text>
                )}
                {result.platformPostId && (
                  <Text style={[styles.platformPostId, { color: theme.colors.primary }]}>
                    Platform Post ID: {result.platformPostId}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Metadata */}
        <View style={styles.metadataSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Details
          </Text>
          <View style={[styles.metadataItem, { borderColor: theme.colors.outline }]}>
            <Text style={[styles.metadataLabel, { color: theme.colors.grey3 }]}>
              Created
            </Text>
            <Text style={[styles.metadataValue, { color: theme.colors.onSurface }]}>
              {formatDate(post.createdAt)}
            </Text>
          </View>
          <View style={[styles.metadataItem, { borderColor: theme.colors.outline }]}>
            <Text style={[styles.metadataLabel, { color: theme.colors.grey3 }]}>
              Updated
            </Text>
            <Text style={[styles.metadataValue, { color: theme.colors.onSurface }]}>
              {formatDate(post.updatedAt)}
            </Text>
          </View>
          <View style={[styles.metadataItem, { borderColor: theme.colors.outline }]}>
            <Text style={[styles.metadataLabel, { color: theme.colors.grey3 }]}>
              Group ID
            </Text>
            <Text style={[styles.metadataValue, { color: theme.colors.onSurface }]}>
              {post.groupId}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformText: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  mediaSection: {
    marginBottom: 24,
  },
  mediaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  mediaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaType: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  mediaStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaStatusText: {
    marginLeft: 4,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  resultsSection: {
    marginBottom: 24,
  },
  resultItem: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultStatus: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  resultDate: {
    marginLeft: 'auto',
    fontSize: 12,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 4,
  },
  platformPostId: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  metadataSection: {
    marginBottom: 24,
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  metadataValue: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
});
