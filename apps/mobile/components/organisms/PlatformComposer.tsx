import IconButton from '@/components/atoms/IconButton';
import CustomizeDialog from '@/components/molecules/CustomizeDialog';
import PlatformSelectorDialog from '@/components/molecules/PlatformSelectorDialog';
import SplitButton, { SplitButtonAction } from '@/components/molecules/SplitButton';
import PostComposer from '@/components/organisms/PostComposer';
import type { Platform , PlatformComposerData, PlatformPosts, PostList } from '@squidbox/contracts';
import { usePlatformContext } from '@/contexts/PlatformContext';
import { TabView } from '@rneui/themed';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

// Platform selection type - only used in this component
type PlatformSelection = Readonly<Record<Platform, boolean>>;

type PostGroup = Readonly<{
  id: string;
}> &
  PlatformPosts;

type PlatformComposerProps = Readonly<{
  userAvatarUri?: string;
  initialData?: PlatformComposerData;
  onDataChange?: (data: PlatformComposerData) => void;
}>;

export function PlatformComposer({
  userAvatarUri,
  initialData,
  onDataChange,
}: PlatformComposerProps) {
  const { connectedPlatforms } = usePlatformContext();

  // Extract platform names from connected platform configs
  const connectedPlatformNames = useMemo(() => connectedPlatforms.map((config) => config.id), [connectedPlatforms]);

  // Helper function to get platform name by ID (from connected platforms only)
  const getPlatformName = (platformId: Platform) =>
    connectedPlatforms.find((platform) => platform.id === platformId)?.name || platformId;

  const [showPlatformSelector, setShowPlatformSelector] = useState(false);
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PostGroup | null>(null);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const groupIdCounterRef = useRef(0);

  // Generates a unique id for new groups (monotonic within this component instance)
  const createUniqueGroupId = () => `group-${groupIdCounterRef.current++}`;
  
  // Post groups state - each group has platforms and a composer
  const [postGroups, setPostGroups] = useState<PostGroup[]>(() => {
    if (initialData?.platformPosts.length) {
      return initialData.platformPosts.map((group) => ({
        id: createUniqueGroupId(),
        platforms: group.platforms,
        posts: group.posts,
      }));
    }
    // Default: create one group with connected platforms (will be updated when connectedPlatformNames changes)
    return [
      {
        id: createUniqueGroupId(),
        platforms: [],
        posts: [],
      },
    ];
  });

  // Stable onPostChange callbacks per group id
  const onPostChangeByGroupRef = useRef<Record<string, (posts: PostList) => void>>({});

  // Update default group when connected platforms change
  useEffect(() => {
    if (
      !initialData?.platformPosts.length &&
      postGroups.length === 1 &&
      postGroups[0].platforms.length === 0
    ) {
      // Only update if we have the default empty group
      setPostGroups([
        {
          id: postGroups[0].id,
          platforms: connectedPlatformNames,
          posts: [],
        },
      ]);
    }
  }, [connectedPlatformNames, initialData?.platformPosts.length]);

  const selectedPlatforms = useMemo(
    () => postGroups.flatMap((group) => group.platforms),
    [postGroups],
  );

  // Get available platforms for customization (platforms that are in the default group but not in custom groups)
  const availablePlatformsForCustomization = useMemo(() => {
    if (postGroups.length === 0) return [];

    const defaultGroup = postGroups[0]; // First group is always the default group
    const customGroups = postGroups.slice(1); // All other groups are custom groups

    if (editingGroup) {
      // When editing, show current group's platforms plus available platforms from default
      const availableFromDefault = defaultGroup.platforms.filter((platform) => {
        const isInOtherCustomGroup = customGroups
          .filter((group) => group.id !== editingGroup.id)
          .some((group) => group.platforms.includes(platform));
        return !isInOtherCustomGroup;
      });

      // Combine current group platforms with available default platforms
      const allAvailable = [...editingGroup.platforms, ...availableFromDefault];
      return [...new Set(allAvailable)]; // Remove duplicates
    } else {
      // When creating new group, show only platforms from default that aren't in any custom group
      return defaultGroup.platforms.filter((platform) => {
        const isInCustomGroup = customGroups.some((group) => group.platforms.includes(platform));
        return !isInCustomGroup;
      });
    }
  }, [postGroups, editingGroup]);

  const handlePlatformsChange = (platforms: PlatformSelection) => {
    // Get currently selected platforms
    const selectedPlatformList = Object.entries(platforms)
      .filter(([, selected]) => selected)
      .map(([platform]) => platform as Platform);

    // Update the first group (default) with selected platforms
    setPostGroups((prev) => {
      const newGroups = [...prev];
      if (newGroups.length > 0) {
        newGroups[0] = {
          ...newGroups[0],
          platforms: selectedPlatformList,
        };
      }
      return newGroups;
    });
  };

  const handlePlatformSelectorClose = useCallback((result?: { platforms: Platform[] }) => {
    setShowPlatformSelector(false);

    if (result?.platforms) {
      // Convert array of platforms to PlatformSelection object
      const newSelection: PlatformSelection = {
        twitter: result.platforms.includes('twitter'),
        bluesky: result.platforms.includes('bluesky'),
        onlyfans: result.platforms.includes('onlyfans'),
        jff: result.platforms.includes('jff'),
      };
      handlePlatformsChange(newSelection);
    }
  }, []);

  const handleCustomizeDialogClose = useCallback(
    (result?: { platforms: Platform[] }) => {
      setShowCustomizeDialog(false);

      if (result) {
        setPostGroups((prev) => {
          const newPlatforms = result.platforms;
          let newGroups = [...prev];
          let targetGroupId: string | undefined;

          // Step 1: Remove selected platforms from all groups
          newGroups = newGroups.map((group) => ({
            ...group,
            platforms: group.platforms.filter((p) => !newPlatforms.includes(p)),
          }));

          // Step 2: Handle the target group
          if (editingGroup) {
            // Find and update the editing group
            targetGroupId = editingGroup.id;
            const groupIndex = newGroups.findIndex((g) => g.id === editingGroup.id);
            if (groupIndex !== -1) {
              newGroups[groupIndex] = {
                ...newGroups[groupIndex],
                platforms: newPlatforms,
              };
            }
          } else {
            // Create new group
            targetGroupId = createUniqueGroupId();
            const activeGroup = postGroups[activeGroupIndex];
            const newGroup: PostGroup = {
              id: targetGroupId,
              platforms: newPlatforms,
              posts: [...activeGroup.posts],
            };
            newGroups.push(newGroup);
          }

          // Step 3: Add all missing connected platforms to the first (default) group
          const availablePlatforms = connectedPlatformNames;
          const platformsInNonDefaultGroups = newGroups.slice(1).flatMap((g) => g.platforms);
          const defaultGroupPlatforms = availablePlatforms.filter(
            (p) => !platformsInNonDefaultGroups.includes(p),
          );
          newGroups[0] = {
            ...newGroups[0],
            platforms: defaultGroupPlatforms,
          };

          // Step 4: Remove groups without platforms (including the first group if it's empty)
          newGroups = newGroups.filter((group) => group.platforms.length > 0);

          // Step 5: Set the active group index to group that was created or edited
          // or the first group if the target group does not exist
          const newActiveGroupIndex = newGroups.findIndex((g) => g.id === targetGroupId);
          setActiveGroupIndex(newActiveGroupIndex === -1 ? 0 : newActiveGroupIndex);

          return newGroups;
        });
      }

      setEditingGroup(null);
    },
    [postGroups, activeGroupIndex, editingGroup, connectedPlatformNames],
  );

  // Stable onPostChange callbacks per group id
  useEffect(() => {
    const map = onPostChangeByGroupRef.current;
    for (const group of postGroups) {
      if (!map[group.id]) {
        map[group.id] = (posts) => {
          setPostGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, posts } : g)));
        };
      }
    }
    // Remove handlers for groups that no longer exist
    for (const id of Object.keys(map)) {
      if (!postGroups.some((g) => g.id === id)) {
        delete map[id];
      }
    }
  }, [postGroups]);

  useEffect(() => {
    onDataChange?.({
      platformPosts: postGroups.map((g) => ({ platforms: g.platforms, posts: g.posts })),
    });
  }, [postGroups, onDataChange]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          padding: 16,
        }}
      >
        <SplitButton type={activeGroupIndex === 0 ? 'solid' : 'outline'} color="secondary">
          <SplitButtonAction
            icon={{ name: 'layers', type: 'feather' }}
            onPress={() => setShowPlatformSelector(true)}
            accessibilityLabel="Select platforms"
          />
          <SplitButtonAction
            title={postGroups[0].platforms.map(getPlatformName).join(', ')}
            onPress={() => setActiveGroupIndex(0)}
            noWrap
          />
        </SplitButton>

        {postGroups.slice(1).map((group, idx) => (
          <SplitButton
            key={group.id}
            type={activeGroupIndex === idx + 1 ? 'solid' : 'outline'}
            color="secondary"
          >
            <SplitButtonAction
              icon={{ name: 'layers', type: 'feather' }}
              onPress={() => {
                setEditingGroup(group);
                setShowCustomizeDialog(true);
              }}
              accessibilityLabel="Edit platforms"
              color="danger"
            />
            <SplitButtonAction
              title={group.platforms.map(getPlatformName).join(', ')}
              onPress={() => setActiveGroupIndex(idx + 1)}
              noWrap
            />
          </SplitButton>
        ))}

        <IconButton
          iconName="layers"
          iconType="feather"
          type="outline"
          color="secondary"
          onPress={() => setShowCustomizeDialog(true)}
          accessibilityLabel="Create a new platform group"
        />
      </ScrollView>

      <TabView value={activeGroupIndex} onChange={setActiveGroupIndex} animationType="spring">
        {postGroups.map((group) => (
          <TabView.Item key={group.id} style={{ flex: 1 }}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <PostComposer
                userAvatarUri={userAvatarUri}
                initialPosts={group.posts}
                onPostChange={onPostChangeByGroupRef.current[group.id]}
                characterLimit={280}
                maxMedia={4}
                supportsMultiplePosts={true}
              />
            </ScrollView>
          </TabView.Item>
        ))}
      </TabView>

      <PlatformSelectorDialog
        isVisible={showPlatformSelector}
        availablePlatforms={connectedPlatformNames}
        selectedPlatforms={selectedPlatforms}
        onClose={handlePlatformSelectorClose}
      />

      <CustomizeDialog
        isVisible={showCustomizeDialog}
        availablePlatforms={availablePlatformsForCustomization}
        editingGroup={editingGroup}
        onClose={handleCustomizeDialogClose}
      />
    </View>
  );
}
