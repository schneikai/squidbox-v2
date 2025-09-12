import IconButton from '@/components/atoms/IconButton';
import TextCounter from '@/components/atoms/TextCounter';
import { Divider } from '@rneui/themed';
import React from 'react';
import { View } from 'react-native';

type PostComposeToolbarProps = Readonly<{
  onAddMedia?: () => void;
  currentCount: number;
  characterLimit?: number;
  onAddPost?: () => void;
  addPostDisabled?: boolean;
}>;

export default function PostComposeToolbar({
  onAddMedia,
  currentCount,
  characterLimit = 280,
  onAddPost,
  addPostDisabled,
}: PostComposeToolbarProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <IconButton
        iconName="image"
        onPress={onAddMedia}
        accessibilityLabel="Add media"
        type="clear"
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TextCounter count={currentCount} limit={characterLimit} />
        {onAddPost ? (
          <>
            <Divider orientation="vertical" />
            <IconButton
              iconName="plus"
              onPress={onAddPost}
              accessibilityLabel="Add another post"
              type="solid"
              color="secondary"
              disabled={addPostDisabled}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}
