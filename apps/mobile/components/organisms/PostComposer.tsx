import Avatar from '@/components/atoms/Avatar';
import IconButton from '@/components/atoms/IconButton';
import MediaGrid from '@/components/molecules/MediaGrid';
import PostComposeToolbar from '@/components/molecules/PostComposeToolbar';
import PostTextInput from '@/components/molecules/PostTextInput';
import type { MediaInput } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

type MediaWithId = Readonly<{
  id: string; // Local identifier for React keys (frontend only)
  uri: string; // Local file URI (frontend only)
}> &
  MediaInput;

type PostWithId = Readonly<{
  text: string;
  media: MediaWithId[];
}>;

type PostComposerProps = Readonly<{
  userAvatarUri?: string;
  initialPosts?: PostWithId[];
  onPostChange?: (posts: PostWithId[]) => void;
  characterLimit?: number;
  maxMedia?: number;
  supportsMultiplePosts?: boolean;
}>;

function PostComposer({
  userAvatarUri,
  initialPosts,
  onPostChange,
  characterLimit = 280,
  maxMedia = 4,
  supportsMultiplePosts = true,
}: PostComposerProps) {
  const [posts, setPosts] = useState<PostWithId[]>(() =>
    initialPosts && initialPosts.length > 0
      ? initialPosts.map((p) => ({ 
          text: p.text, 
          media: p.media.map(mediaItem => ({
            ...mediaItem,
            id: mediaItem.id || `media-${Date.now()}-${Math.random()}`,
            uri: mediaItem.uri || mediaItem.url,
          }))
        }))
      : [{ text: '', media: [] }],
  );

  useEffect(() => {
    onPostChange?.(posts);
  }, [posts, onPostChange]);

  const addPost = () => {
    if (supportsMultiplePosts) {
      setPosts((prev) => [...prev, { text: '', media: [] }]);
    }
  };

  const updatePostText = (text: string, index: number) => {
    setPosts((prev) => prev.map((p, i) => (i === index ? { ...p, text } : p)));
  };

  const removePost = (index: number) => {
    setPosts((prev) => prev.filter((_, i) => i !== index));
  };

  const removeMediaFromPost = (postIndex: number, mediaId: string) => {
    setPosts((prev) =>
      prev.map((p, i) =>
        i === postIndex ? { ...p, media: p.media.filter((m) => m.id !== mediaId) } : p,
      ),
    );
  };

  const requestPickerPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const pickMediaForPost = async (postIndex: number) => {
    const granted = await requestPickerPermissions();
    if (!granted) return;

    const existing = posts[postIndex]?.media ?? [];
    const hasVideo = existing.some((m) => m.type === 'video');
    const imageCount = existing.filter((m) => m.type === 'image').length;
    const remainingImages = Math.max(0, maxMedia - imageCount);
    const allowMultiple = !hasVideo && remainingImages > 1;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: allowMultiple,
      selectionLimit: allowMultiple ? remainingImages : 1,
      quality: 1,
      videoMaxDuration: 60,
    });

    if (result.canceled) return;

    const newItems: MediaWithId[] = result.assets
      .map((asset) => {
        const kind: 'image' | 'video' = asset.type?.startsWith('video') ? 'video' : 'image';
        if (kind === 'video' && (existing.length > 0 || result.assets.length > 1)) {
          return null;
        }
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          uri: asset.uri,
          type: kind,
          url: asset.uri, // For contract compatibility
          localPath: undefined, // Can be set later if needed
        } as MediaWithId;
      })
      .filter((x): x is MediaWithId => Boolean(x));

    setPosts((prev) =>
      prev.map((p, i) =>
        i === postIndex
          ? {
              ...p,
              media: (() => {
                const combined = [...p.media, ...newItems];
                const hasPickedVideo = combined.some((m) => m.type === 'video');
                if (hasPickedVideo) {
                  const firstVideo = combined.find((m) => m.type === 'video');
                  return firstVideo ? [firstVideo] : [];
                }
                return combined.slice(0, maxMedia);
              })(),
            }
          : p,
      ),
    );
  };

  const canAddPost = useMemo(() => {
    if (posts.length === 0) return false;
    const last = posts[posts.length - 1];
    return last.text.trim().length > 0 || last.media.length > 0;
  }, [posts]);

  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View>
        <Avatar uri={userAvatarUri} size={44} accessibilityLabel="User avatar" />
      </View>
      <View style={{ flex: 1, gap: 12 }}>
        {posts.map((post, idx) => (
          <View key={`post-${idx}`} style={{ position: 'relative', gap: 8 }}>
            <PostTextInput value={post.text} onChangeText={(text) => updatePostText(text, idx)} />
            <MediaGrid media={post.media} onRemove={(id) => removeMediaFromPost(idx, id)} />
            <PostComposeToolbar
              onAddMedia={() => pickMediaForPost(idx)}
              currentCount={post.text.length}
              characterLimit={characterLimit}
              onAddPost={idx === posts.length - 1 && supportsMultiplePosts ? addPost : undefined}
              addPostDisabled={!canAddPost || !supportsMultiplePosts}
            />
            {idx > 0 ? (
              <View style={{ position: 'absolute', top: -8, right: -8 }}>
                <IconButton
                  iconName="x"
                  accessibilityLabel={`Remove post ${idx + 1}`}
                  onPress={() => removePost(idx)}
                  color="error"
                />
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export default PostComposer;
