import { isConnected } from '@/utils/platformService';
import { Platform, PLATFORM_CONFIGS, SUPPORTED_PLATFORMS, type PlatformConfig } from '@squidbox/contracts';
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';

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

