import PlatformCard from '@/components/molecules/PlatformCard';
import { usePlatformCard } from './hooks/usePlatformCard';
import React from 'react';

interface TwitterFeatureProps {
  isRefreshing?: boolean;
}

export default function TwitterFeature({ isRefreshing = false }: TwitterFeatureProps) {
  const { config, status, handlePlatformPress, isRefreshing: isRefreshingInternal } = usePlatformCard({
    platform: 'twitter',
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
