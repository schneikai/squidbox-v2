import Button from '@/components/atoms/Button';
import type { Platform } from '@/contexts/PlatformContext';
import { usePlatformContext } from '@/contexts/PlatformContext';
import { CheckBox, Dialog, Text, useTheme } from '@rneui/themed';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

type CustomizeDialogProps = Readonly<{
  isVisible: boolean;
  availablePlatforms: readonly Platform[];
  editingGroup?: { platforms: readonly Platform[] } | null;
  onClose: (result?: { platforms: Platform[] }) => void;
}>;

export default function CustomizeDialog({
  isVisible,
  availablePlatforms,
  editingGroup,
  onClose,
}: CustomizeDialogProps) {
  const { platformConfigs } = usePlatformContext();
  const { theme } = useTheme();
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);

  // Reset selection when dialog opens/closes
  useEffect(() => {
    if (!isVisible) {
      setSelectedPlatforms([]);
    } else if (editingGroup) {
      // Pre-select platforms when editing
      setSelectedPlatforms([...editingGroup.platforms]);
    }
  }, [isVisible, editingGroup]);

  const handleCancel = () => {
    setSelectedPlatforms([]);
    onClose(); // No payload = cancelled
  };

  const handleCreateGroup = () => {
    onClose({ platforms: [...selectedPlatforms] }); // Always save, even if empty
    setSelectedPlatforms([]);
  };

  const canCreateGroup = editingGroup ? true : selectedPlatforms.length > 0; // Allow saving when editing (even with no platforms), but require platforms when creating

  return (
    <Dialog
      isVisible={isVisible}
      onBackdropPress={handleCancel}
      overlayStyle={{
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
      }}
    >
      <Dialog.Title
        title={editingGroup ? 'Edit platform selection' : 'Tailor to platform'}
        titleStyle={{ color: theme.colors.onSurface, fontSize: 25, lineHeight: 35 }}
      />

      <Text style={{ marginBottom: 20, lineHeight: 20 }}>
        Some platforms have different requirements. Select platforms to create platform‑specific
        posts.
      </Text>

      <View style={{ gap: 8 }}>
        {availablePlatforms.length === 0 ? (
          <Text
            style={{
              color: theme.colors.onSurface,
              fontSize: 14,
              textAlign: 'center',
              fontStyle: 'italic',
              paddingVertical: 16,
            }}
          >
            All platforms already have customizations
          </Text>
        ) : (
          availablePlatforms.map((platform) => {
            const config = platformConfigs[platform];
            const isSelected = selectedPlatforms.includes(platform);

            return (
              <View
                key={platform}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {/* <View style={{ width: 40, alignItems: 'flex-start' }}>
                    <Icon name={config.icon} type="feather" color={config.color} size={24} />
                  </View> */}

                  <Text>{config.name}</Text>
                </View>

                <CheckBox
                  checked={isSelected}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedPlatforms((prev) => prev.filter((p) => p !== platform));
                    } else {
                      setSelectedPlatforms((prev) => [...prev, platform]);
                    }
                  }}
                  containerStyle={{ margin: 0, padding: 0 }}
                />
              </View>
            );
          })
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 30, justifyContent: 'flex-end' }}>
        <Button title="Cancel" onPress={handleCancel} color="secondary" type="outline" />
        <Button
          title={editingGroup ? 'Update' : 'Create'}
          onPress={handleCreateGroup}
          disabled={!canCreateGroup}
          color="primary"
        />
      </View>
    </Dialog>
  );
}
