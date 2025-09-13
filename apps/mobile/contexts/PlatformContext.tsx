import { PlatformService } from '@/utils/platformService';
import type { Platform } from '@squidbox/contracts';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// Re-export Platform type from contracts
export type { Platform } from '@squidbox/contracts';

export type PlatformConfig = Readonly<{
  id: Platform;
  name: string;
  icon: string;
  color: string;
  characterLimit: number;
  maxMedia: number;
  supportsVideo: boolean;
  supportsMultiplePosts: boolean;
}>;

export type PlatformStatus = Readonly<{
  isConnected: boolean;
  username?: string;
  userId?: string;
}>;

export type ConnectedPlatform = Readonly<{
  platform: Platform;
  config: PlatformConfig;
  status: PlatformStatus;
}>;

type PlatformContextType = Readonly<{
  // Platform arrays (same structure - full PlatformConfig objects)
  supportedPlatforms: PlatformConfig[];
  connectedPlatforms: PlatformConfig[];

  // Platform configurations and statuses
  platformConfigs: Record<Platform, PlatformConfig>;
  platformStatuses: Record<Platform, PlatformStatus>;
  connectedPlatformDetails: ConnectedPlatform[];

  // Loading states
  isLoading: boolean;

  // Actions
  refreshPlatformStatuses: () => Promise<void>;
  getPlatformConfig: (platform: Platform) => PlatformConfig;
  getPlatformStatus: (platform: Platform) => PlatformStatus;
  isPlatformConnected: (platform: Platform) => boolean;
  getPlatformsByFeature: (feature: keyof PlatformConfig) => Platform[];
  getConnectedPlatformsByFeature: (feature: keyof PlatformConfig) => ConnectedPlatform[];
}>;

const PlatformContext = createContext<PlatformContextType | null>(null);

// Platform configurations
const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  twitter: {
    id: 'twitter',
    name: 'Twitter',
    icon: 'twitter',
    color: '#1DA1F2',
    characterLimit: 280,
    maxMedia: 4,
    supportsVideo: true,
    supportsMultiplePosts: true,
  },
  bluesky: {
    id: 'bluesky',
    name: 'Bluesky',
    icon: 'cloud',
    color: '#00A8E8',
    characterLimit: 300,
    maxMedia: 4,
    supportsVideo: true,
    supportsMultiplePosts: true,
  },
  onlyfans: {
    id: 'onlyfans',
    name: 'OnlyFans',
    icon: 'heart',
    color: '#00AFF0',
    characterLimit: 500,
    maxMedia: 10,
    supportsVideo: true,
    supportsMultiplePosts: false,
  },
  jff: {
    id: 'jff',
    name: 'JFF',
    icon: 'camera',
    color: '#FF6B6B',
    characterLimit: 1000,
    maxMedia: 20,
    supportsVideo: true,
    supportsMultiplePosts: false,
  },
} as const;

type PlatformProviderProps = Readonly<{
  children: React.ReactNode;
}>;

// Create supported platforms array outside component to ensure stable reference
const SUPPORTED_PLATFORMS = Object.values(PLATFORM_CONFIGS);

export function PlatformProvider({ children }: PlatformProviderProps) {
  const [platformStatuses, setPlatformStatuses] = useState<Record<Platform, PlatformStatus>>({
    twitter: { isConnected: false },
    bluesky: { isConnected: false },
    onlyfans: { isConnected: false },
    jff: { isConnected: false },
  });
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  // Get platform status using unified service
  const getPlatformStatusAsync = useCallback(
    async (platform: Platform): Promise<PlatformStatus> => {
      try {
        const isConnected = await PlatformService.isConnected(platform);
        if (isConnected) {
          const userInfo = await PlatformService.getCachedUser(platform);
          return {
            isConnected: true,
            username: userInfo?.username,
            userId: userInfo?.id,
          };
        }
        return { isConnected: false };
      } catch (error) {
        console.log(`${platform} not connected:`, error);
        return { isConnected: false };
      }
    },
    [],
  );

  // Get status of a specific platform (synchronous - returns current state)
  const getPlatformStatus = useCallback(
    (platform: Platform): PlatformStatus => {
      return platformStatuses[platform] || { isConnected: false };
    },
    [platformStatuses],
  );

  // Refresh all platform statuses
  const refreshPlatformStatuses = useCallback(async () => {
    setIsLoading(true);
    const newStatuses: Record<Platform, PlatformStatus> = {
      twitter: { isConnected: false },
      bluesky: { isConnected: false },
      onlyfans: { isConnected: false },
      jff: { isConnected: false },
    };

    for (const platform of SUPPORTED_PLATFORMS) {
      newStatuses[platform.id] = await getPlatformStatusAsync(platform.id);
    }

    setPlatformStatuses(newStatuses);
    setIsLoading(false);
  }, [getPlatformStatusAsync]);

  // Get platform configuration
  const getPlatformConfig = useCallback((platform: Platform): PlatformConfig => {
    return PLATFORM_CONFIGS[platform];
  }, []);

  // Check if platform is connected
  const isPlatformConnected = useCallback(
    (platform: Platform): boolean => {
      return platformStatuses[platform]?.isConnected || false;
    },
    [platformStatuses],
  );

  // Get platforms by feature
  const getPlatformsByFeature = useCallback((feature: keyof PlatformConfig): Platform[] => {
    return Object.entries(PLATFORM_CONFIGS)
      .filter(([, config]) => {
        const value = config[feature];
        return typeof value === 'boolean' ? value : true;
      })
      .map(([platform]) => platform as Platform);
  }, []);

  // Get connected platform details (full objects)
  const connectedPlatformDetails: ConnectedPlatform[] = Object.entries(platformStatuses)
    .filter(([, status]) => status.isConnected)
    .map(([platform, status]) => ({
      platform: platform as Platform,
      config: PLATFORM_CONFIGS[platform as Platform],
      status,
    }));

  // Get connected platforms (full PlatformConfig objects)
  const connectedPlatforms: PlatformConfig[] = connectedPlatformDetails.map(({ config }) => config);

  // Get connected platforms by feature
  const getConnectedPlatformsByFeature = useCallback(
    (feature: keyof PlatformConfig): ConnectedPlatform[] => {
      return connectedPlatformDetails.filter(({ config }) => {
        const value = config[feature];
        return typeof value === 'boolean' ? value : true;
      });
    },
    [connectedPlatformDetails],
  );

  // Initial load - only run once
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      const loadInitialStatuses = async () => {
        setIsLoading(true);
        const newStatuses: Record<Platform, PlatformStatus> = {
          twitter: { isConnected: false },
          bluesky: { isConnected: false },
          onlyfans: { isConnected: false },
          jff: { isConnected: false },
        };

        for (const platform of SUPPORTED_PLATFORMS) {
          newStatuses[platform.id] = await getPlatformStatusAsync(platform.id);
        }

        setPlatformStatuses(newStatuses);
        setIsLoading(false);
      };
      loadInitialStatuses();
    }
  }, [getPlatformStatusAsync]);

  const contextValue: PlatformContextType = {
    // Platform arrays (same structure)
    supportedPlatforms: SUPPORTED_PLATFORMS,
    connectedPlatforms,

    // Platform configurations and statuses
    platformConfigs: PLATFORM_CONFIGS,
    platformStatuses,
    connectedPlatformDetails,

    // Loading states
    isLoading,

    // Actions
    refreshPlatformStatuses,
    getPlatformConfig,
    getPlatformStatus,
    isPlatformConnected,
    getPlatformsByFeature,
    getConnectedPlatformsByFeature,
  };

  return <PlatformContext.Provider value={contextValue}>{children}</PlatformContext.Provider>;
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

/**
 * Hook for getting platform statuses (shorthand)
 */
export function usePlatformStatuses() {
  const { platformStatuses, isLoading, refreshPlatformStatuses } = usePlatformContext();
  return { platformStatuses, isLoading, refreshPlatformStatuses };
}

/**
 * Hook for getting connected platforms (shorthand)
 */
export function useConnectedPlatforms() {
  const { connectedPlatformDetails, connectedPlatforms, isLoading, refreshPlatformStatuses } =
    usePlatformContext();
  return { connectedPlatformDetails, connectedPlatforms, isLoading, refreshPlatformStatuses };
}
