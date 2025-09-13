import PlatformCard from '@/components/molecules/PlatformCard';
import { usePlatformCard } from './hooks/usePlatformCard';
import React from 'react';

interface BlueskyFeatureProps {
  isRefreshing?: boolean;
}

export default function BlueskyFeature({ isRefreshing = false }: BlueskyFeatureProps) {
  const { config, status, handlePlatformPress, isRefreshing: isRefreshingInternal } = usePlatformCard({
    platform: 'bluesky',
    isRefreshing,
  });

  if (!config) return null;

  return (
    <PlatformCard
      config={config}
      status={status}
      isRefreshing={isRefreshingInternal}
      onPress={handlePlatformPress}
    />
  );
}
