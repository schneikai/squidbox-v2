import { usePlatformContext } from '@/contexts/PlatformContext';
import type { Platform } from '@squidbox/contracts';
import { getCachedUser, refreshAuthStatus, isConnected, disconnectPlatformTokens } from '@/utils/platformService';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

interface PlatformStatus {
  isConnected: boolean;
  username?: string;
}

interface UsePlatformCardProps {
  platform: Platform;
  isRefreshing?: boolean;
}

export function usePlatformCard({ platform, isRefreshing = false }: UsePlatformCardProps) {
  const { supportedPlatforms, onPlatformDisconnected } = usePlatformContext();
  const [status, setStatus] = useState<PlatformStatus>({ isConnected: false });
  const [isRefreshingInternal, setIsRefreshingInternal] = useState(false);

  const config = supportedPlatforms.find((p) => p.id === platform);

  if(!config) {
    throw new Error(`Platform ${platform} not found`);
  }

  // Get current status for display
  const getCurrentStatus = useCallback(async () => {
    try {
      const userInfo = await getCachedUser(platform);
      if (userInfo) {
        return {
          isConnected: true,
          username: userInfo?.username,
        };
      }
      return { isConnected: false };
    } catch (error) {
      console.log(`${platform} not connected:`, error);
      return { isConnected: false };
    }
  }, [platform]);

  // Update status when component mounts or when refreshing
  useEffect(() => {
    if (isRefreshing) {
      setIsRefreshingInternal(true);
      
      refreshAuthStatus(platform).finally(() => {
        setIsRefreshingInternal(false);
      });
    }

    getCurrentStatus().then(setStatus);
  }, [getCurrentStatus, isRefreshing, platform]);

  const handlePlatformPress = useCallback(async () => {
    // Get current status to determine action
    const isConnectedStatus = await isConnected(platform);
    
    if (isConnectedStatus) {
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
              try {
                // Disconnect the platform by deleting tokens from backend
                await disconnectPlatformTokens(platform);
                
                // Notify the platform context that a platform was disconnected
                onPlatformDisconnected();
                
                // Update local status
                getCurrentStatus().then(setStatus);
                
                Alert.alert('Success', `Successfully disconnected from ${config.name}!`);
              } catch (error) {
                console.error('Error disconnecting platform:', error);
                Alert.alert('Error', 'Failed to disconnect from the platform. Please try again.');
              }
            },
          },
        ],
      );
    } else {
      // Handle authentication based on config
      if (config.authUrl) {
        router.push(config.authUrl as any);
      } else {
        Alert.alert('Coming Soon', 'Authentication will be available soon!');
      }
    }
  }, [platform, config, getCurrentStatus]);

  return {
    config,
    status,
    handlePlatformPress,
    isRefreshing: isRefreshingInternal,
  };
}
