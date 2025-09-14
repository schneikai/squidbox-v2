import { isConnected } from '@/utils/platformService';
import type { Platform } from '@squidbox/contracts';
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';


type PlatformConfig = Readonly<{
  id: Platform;
  name: string;
  icon: string;
  color: string;
  characterLimit: number;
  maxMedia: number;
  supportsVideo: boolean;
  supportsMultiplePosts: boolean;
  authUrl?: string;
}>;

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  twitter: {
    id: 'twitter',
    name: 'Twitter',
    icon: 'twitter',
    color: '#1DA1F2',
    characterLimit: 280,
    maxMedia: 4,
    supportsVideo: true,
    supportsMultiplePosts: true,
    authUrl: '/auth/twitter',
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

const SUPPORTED_PLATFORMS = Object.values(PLATFORM_CONFIGS) as Readonly<PlatformConfig[]>;

type PlatformContextType = Readonly<{
  supportedPlatforms: typeof SUPPORTED_PLATFORMS;
  connectedPlatforms: Readonly<PlatformConfig[]>;

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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const results = await Promise.all(
        SUPPORTED_PLATFORMS.map(async (platform) =>
          (await isConnected(platform.id)) ? platform : null
        )
      );
      if (!cancelled) {
        setConnectedPlatforms(results.filter(Boolean) as typeof SUPPORTED_PLATFORMS);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      supportedPlatforms: SUPPORTED_PLATFORMS,
      connectedPlatforms,
      platformConfigs: PLATFORM_CONFIGS,
    }),
    [connectedPlatforms]
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

