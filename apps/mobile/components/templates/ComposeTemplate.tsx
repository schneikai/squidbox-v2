import Button from '@/components/atoms/Button';
import { PlatformComposer } from '@/components/organisms/PlatformComposer';
import type { PlatformComposerData, PlatformPosts } from '@/types/post';
import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ComposeTemplateProps = Readonly<{
  userAvatarUri?: string;
  onPost?: (platformPosts: readonly PlatformPosts[]) => void;
}>;

export default function ComposeTemplate({ userAvatarUri, onPost }: ComposeTemplateProps) {
  const insets = useSafeAreaInsets();
  const [platformPosts, setPlatformPosts] = useState<readonly PlatformPosts[]>([]);

  const handleDataChange = useCallback((data: PlatformComposerData) => {
    setPlatformPosts(data.platformPosts);
  }, []);

  const canPost = useMemo(() => {
    return platformPosts.every((group) =>
      group.posts.some((p) => p.text.trim().length > 0 || p.media.length > 0),
    );
  }, [platformPosts]);

  const handlePost = useCallback(() => {
    onPost?.(platformPosts);
  }, [platformPosts, onPost]);

  // Get all selected platforms from all groups
  const selectedPlatforms = useMemo(() => {
    return platformPosts.flatMap((group) => group.platforms);
  }, [platformPosts]);

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
