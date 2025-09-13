import PlatformCard from '@/components/molecules/PlatformCard';
import { usePlatformCard } from './hooks/usePlatformCard';
import React from 'react';

interface JFFFeatureProps {
  isRefreshing?: boolean;
}

export default function JFFFeature({ isRefreshing = false }: JFFFeatureProps) {
  const { config, status, handlePlatformPress, isRefreshing: isRefreshingInternal } = usePlatformCard({
    platform: 'jff',
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
