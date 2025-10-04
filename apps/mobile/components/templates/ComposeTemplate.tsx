import Button from '@/components/atoms/Button';
import { PlatformComposer } from '@/components/organisms/PlatformComposer';
import type { PostGroup } from '@/types';
import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ComposeTemplateProps = Readonly<{
  userAvatarUri?: string;
  onPost?: (postGroups: readonly PostGroup[]) => void;
}>;

export default function ComposeTemplate({ userAvatarUri, onPost }: ComposeTemplateProps) {
  const insets = useSafeAreaInsets();
  const [postGroups, setPostGroups] = useState<readonly PostGroup[]>([]);

  const handleDataChange = useCallback((data: { postGroups: readonly PostGroup[] }) => {
    setPostGroups(data.postGroups);
  }, []);

  const canPost = useMemo(() => {
    return postGroups.every((group: PostGroup) =>
      group.posts.some((p) => p.text.trim().length > 0 || p.media.length > 0),
    );
  }, [postGroups]);

  const handlePost = useCallback(() => {
    onPost?.(postGroups);
  }, [postGroups, onPost]);

  // Get all selected platforms from all groups
  const selectedPlatforms = useMemo(() => {
    return postGroups.flatMap((group) => group.platforms);
  }, [postGroups]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, paddingTop: insets.top }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <PlatformComposer userAvatarUri={userAvatarUri} onDataChange={handleDataChange} />

      <View
        style={{
          padding: 16,
          paddingBottom: Math.max(16, insets.bottom),
          backgroundColor: 'transparent',
        }}
      >
        <Button
          title={`Post to ${selectedPlatforms.length} platform${selectedPlatforms.length > 1 ? 's' : ''}`}
          onPress={handlePost}
          disabled={!canPost}
          accessibilityLabel="Post to selected platforms"
          type="solid"
          size="lg"
          color="primary"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
