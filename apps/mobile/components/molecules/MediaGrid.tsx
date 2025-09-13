import MediaThumbnail from '@/components/atoms/MediaThumbnail';
import type { MediaItem } from '@squidbox/contracts';
import React from 'react';
import { ScrollView } from 'react-native';

type MediaGridProps = Readonly<{
  media: readonly MediaItem[];
  onRemove?: (id: string) => void;
}>;

export default function MediaGrid({ media, onRemove }: MediaGridProps) {
  if (!media || media.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: 'row', gap: 12 }}
    >
      {media.map((m) => (
        <MediaThumbnail
          key={m.id}
          uri={m.uri}
          type={m.type}
          onRemove={onRemove ? () => onRemove(m.id) : undefined}
        />
      ))}
    </ScrollView>
  );
}
