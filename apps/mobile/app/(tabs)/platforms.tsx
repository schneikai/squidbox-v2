import Icon from '@/components/atoms/Icon';
import { usePlatformContext, usePlatformStatuses } from '@/contexts/PlatformContext';
import type { Platform } from '@squidbox/contracts';
import { PlatformService } from '@/utils/platformService';
import { Card, ListItem, Text, useTheme } from '@rneui/themed';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PlatformsPage() {
  const { theme } = useTheme();
  const { supportedPlatforms } = usePlatformContext();
  const { platformStatuses, isLoading, refreshPlatformStatuses } = usePlatformStatuses();
  const insets = useSafeAreaInsets();

  // Refresh platform connections when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshPlatformStatuses();
    }, [refreshPlatformStatuses]),
  );

  const handlePlatformPress = async (platform: Platform) => {
    const status = platformStatuses[platform];
    const config = supportedPlatforms.find((p) => p.id === platform);

    if (!config) return;

    if (status.isConnected) {
      // Show disconnect option
      Alert.alert(
        'Disconnect Account',
        `Are you sure you want to disconnect from ${config.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              await PlatformService.signOut(platform);
              await refreshPlatformStatuses();
            },
          },
        ],
      );
    } else {
      // Navigate to authentication
      switch (platform) {
        case 'twitter':
          router.push('/auth/twitter');
          break;
        case 'bluesky':
          Alert.alert('Coming Soon', 'Bluesky authentication will be available soon!');
          break;
        case 'onlyfans':
          Alert.alert('Coming Soon', 'OnlyFans authentication will be available soon!');
          break;
        case 'jff':
          Alert.alert('Coming Soon', 'JFF authentication will be available soon!');
          break;
      }
    }
  };

  const renderPlatformItem = (platform: Platform) => {
    const config = supportedPlatforms.find((p) => p.id === platform);
    const status = platformStatuses[platform];

    if (!config) return null;

    return (
      <Card containerStyle={styles.platformCard}>
        <ListItem
          onPress={() => handlePlatformPress(platform)}
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
          <Icon
            name={status.isConnected ? 'check-circle' : 'plus-circle'}
            type="feather"
            size={24}
            color={status.isConnected ? theme.colors.success : theme.colors.primary}
          />
        </ListItem>
      </Card>
    );
  };

  return (
    <ScrollView
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top + 16,
        },
      ]}
    >
      <Text h3 style={[styles.title, { color: theme.colors.black }]}>
        Social Media Platforms
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.grey2 }]}>
        {isLoading
          ? 'Checking connections...'
          : 'Connect your social media accounts to start posting'}
      </Text>

      {supportedPlatforms.map((platform) => (
        <View key={platform.id}>{renderPlatformItem(platform.id)}</View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 24,
    textAlign: 'center',
  },
  platformCard: {
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: 'transparent',
  },
  platformItem: {
    backgroundColor: 'transparent',
  },
});
