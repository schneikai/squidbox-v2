import Icon from '@/components/atoms/Icon';
import { Card, ListItem, useTheme } from '@rneui/themed';
import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  authUrl?: string;
}

interface PlatformStatus {
  isConnected: boolean;
  username?: string;
}

interface PlatformCardProps {
  config: PlatformConfig;
  status: PlatformStatus;
  isRefreshing: boolean;
  onPress: () => void;
}

export default function PlatformCard({ config, status, isRefreshing, onPress }: PlatformCardProps) {
  const { theme } = useTheme();

  return (
    <Card containerStyle={styles.platformCard}>
      <ListItem
        onPress={onPress}
        containerStyle={styles.platformItem}
      >
        <Icon
          name={config.icon}
          type="feather"
          size={32}
          color={status.isConnected ? config.color : theme.colors.grey3}
        />
        <ListItem.Content>
          <ListItem.Title>{config.name}</ListItem.Title>
          {status.isConnected && (
            <ListItem.Subtitle
              style={{
                color: theme.colors.success,
              }}
            >
              {status.username ? `@${status.username}` : 'Connected'}
            </ListItem.Subtitle>
          )}
        </ListItem.Content>
        {isRefreshing ? (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
          />
        ) : (
          <Icon
            name={status.isConnected ? 'check-circle' : 'plus-circle'}
            type="feather"
            size={24}
            color={status.isConnected ? theme.colors.success : theme.colors.primary}
          />
        )}
      </ListItem>
    </Card>
  );
}

const styles = StyleSheet.create({
  platformCard: {
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: 'transparent',
  },
  platformItem: {
    backgroundColor: 'transparent',
  },
});
