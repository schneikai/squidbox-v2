import { Avatar as RNEAvatar } from '@rneui/themed';
import React from 'react';
import { View } from 'react-native';

type AvatarProps = Readonly<{
  uri?: string;
  size?: number;
  accessibilityLabel?: string;
}>;

export default function Avatar({ uri, size = 40, accessibilityLabel }: AvatarProps) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <RNEAvatar
        rounded
        size={size}
        source={uri ? { uri } : undefined}
        icon={!uri ? { name: 'user', type: 'feather' } : undefined}
        containerStyle={{ backgroundColor: '#d1d5db' }}
      />
    </View>
  );
}
