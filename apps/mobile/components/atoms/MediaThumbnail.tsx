import IconButton from '@/components/atoms/IconButton';
import type { MediaType } from '@/types/media';
import { Icon, Text, useTheme } from '@rneui/themed';
import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

type MediaThumbnailProps = Readonly<{
  uri: string;
  type?: MediaType;
  onRemove?: () => void;
}>;

export default function MediaThumbnail({ uri, type = 'image', onRemove }: MediaThumbnailProps) {
  const { theme } = useTheme();
  return (
    <View style={{ width: 140, height: 180, borderRadius: 12, overflow: 'hidden' }}>
      {type === 'image' ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <View
          style={{
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors?.grey5 ?? '#333',
          }}
        >
          <Icon name="video" type="feather" color="#fff" size={28} />
          <Text style={{ color: '#fff', marginTop: 8 }}>Video</Text>
        </View>
      )}
      {onRemove ? (
        <View style={{ position: 'absolute', top: 6, right: 6 }}>
          <IconButton
            iconName="x"
            accessibilityLabel="Remove media"
            onPress={onRemove}
            type="solid"
            color="error"
          />
        </View>
      ) : null}
    </View>
  );
}
