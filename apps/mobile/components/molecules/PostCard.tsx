import { useTheme } from '@rneui/themed';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Icon from '@/components/atoms/Icon';
import type { PostListItem } from '@squidbox/contracts';

type PostCardProps = {
  post: PostListItem;
  onPress: () => void;
};

export default function PostCard({ post, onPress }: PostCardProps) {
  const { theme } = useTheme();

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
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const hasMedia = post.media.length > 0;
  const statusColor = getStatusColor(post.status);
  const statusIcon = getStatusIcon(post.status);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.platformInfo}>
          <Icon 
            name={post.platform === 'twitter' ? 'twitter' : 'share-2'} 
            type="feather" 
            size={16} 
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
            size={14} 
            color={statusColor} 
          />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {post.status}
          </Text>
        </View>
      </View>

      <Text 
        style={[styles.text, { color: theme.colors.onSurface }]}
        numberOfLines={3}
        ellipsizeMode="tail"
      >
        {post.text}
      </Text>

      <View style={styles.footer}>
        <View style={styles.metaInfo}>
          {hasMedia && (
            <View style={styles.mediaIndicator}>
              <Icon name="image" type="feather" size={12} color={theme.colors.grey3} />
              <Text style={[styles.mediaText, { color: theme.colors.grey3 }]}>
                {post.media.length} media
              </Text>
            </View>
          )}
          <Text style={[styles.dateText, { color: theme.colors.grey3 }]}>
            {formatDate(post.createdAt)}
          </Text>
        </View>
        
        {post.postResult?.platformPostId && (
          <View style={styles.externalLink}>
            <Icon name="external-link" type="feather" size={12} color={theme.colors.primary} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  mediaText: {
    marginLeft: 4,
    fontSize: 12,
  },
  dateText: {
    fontSize: 12,
  },
  externalLink: {
    padding: 4,
  },
});
