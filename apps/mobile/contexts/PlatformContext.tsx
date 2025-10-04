import { getPlatformStatuses } from '@/utils/platformService';
import { Platform } from '@squidbox/contracts';
import { PLATFORM_CONFIGS, SUPPORTED_PLATFORMS, type PlatformConfig } from '@squidbox/contracts';
import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';

type PlatformContextType = Readonly<{
  supportedPlatforms: typeof SUPPORTED_PLATFORMS;
  connectedPlatforms: Readonly<PlatformConfig[]>;
  isLoading: boolean;
  refreshPlatforms: () => Promise<void>;
  onPlatformConnected: () => void;
  onPlatformDisconnected: () => void;

  // Platform configurations
  platformConfigs: Record<Platform, PlatformConfig>;
}>;

const PlatformContext = createContext<PlatformContextType | null>(null);

type PlatformProviderProps = Readonly<{
  children: React.ReactNode;
}>;

export function PlatformProvider({ children }: PlatformProviderProps) {
  const [connectedPlatforms, setConnectedPlatforms] = useState<
    typeof SUPPORTED_PLATFORMS
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPlatforms = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('PlatformProvider: Refreshing platform statuses...');
      const statuses = await getPlatformStatuses(true);
      
      const connected = SUPPORTED_PLATFORMS.filter(platform => {
        const status = statuses.find(s => s.platform === platform.id);
        return status?.isConnected || false;
      });
      
      console.log('PlatformProvider: Connected platforms:', connected.map(p => p.id));
      setConnectedPlatforms(connected);
    } catch (error) {
      console.error('PlatformProvider: Error refreshing platforms:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onPlatformConnected = useCallback(() => {
    console.log('PlatformProvider: Platform connected, refreshing...');
    refreshPlatforms();
  }, [refreshPlatforms]);

  const onPlatformDisconnected = useCallback(() => {
    console.log('PlatformProvider: Platform disconnected, refreshing...');
    refreshPlatforms();
  }, [refreshPlatforms]);

  useEffect(() => {
    refreshPlatforms();
  }, [refreshPlatforms]);

  const contextValue = useMemo(
    () => ({
      supportedPlatforms: SUPPORTED_PLATFORMS,
      connectedPlatforms,
      isLoading,
      refreshPlatforms,
      onPlatformConnected,
      onPlatformDisconnected,
      platformConfigs: PLATFORM_CONFIGS,
    }),
    [connectedPlatforms, isLoading, refreshPlatforms, onPlatformConnected, onPlatformDisconnected]
  );

  return (
    <PlatformContext.Provider value={contextValue}>
      {children}
    </PlatformContext.Provider>
  );
}

/**
 * Hook to use the platform context
 */
export function usePlatformContext(): PlatformContextType {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatformContext must be used within a PlatformProvider');
  }
  return context;
}

