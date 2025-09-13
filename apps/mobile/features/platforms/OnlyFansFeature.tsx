import PlatformCard from '@/components/molecules/PlatformCard';
import { usePlatformCard } from './hooks/usePlatformCard';
import React from 'react';

interface OnlyFansFeatureProps {
  isRefreshing?: boolean;
}

export default function OnlyFansFeature({ isRefreshing = false }: OnlyFansFeatureProps) {
  const { config, status, handlePlatformPress, isRefreshing: isRefreshingInternal } = usePlatformCard({
    platform: 'onlyfans',
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
