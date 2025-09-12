import Button from '@/components/atoms/Button';
import type { Platform } from '@/contexts/PlatformContext';
import { usePlatformContext } from '@/contexts/PlatformContext';
import { Dialog, Switch, useTheme } from '@rneui/themed';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

type PlatformSelectorDialogProps = Readonly<{
  isVisible: boolean;
  availablePlatforms: readonly Platform[];
  selectedPlatforms: readonly Platform[];
  onClose: (result?: { platforms: Platform[] }) => void;
}>;

export default function PlatformSelectorDialog({
  isVisible,
  availablePlatforms,
  selectedPlatforms: initialSelectedPlatforms,
  onClose,
}: PlatformSelectorDialogProps) {
  const { platformConfigs } = usePlatformContext();
  const { theme } = useTheme();
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);

  // Initialize and reset selection when dialog opens/closes
  useEffect(() => {
    if (isVisible) {
      // Initialize with current selection when dialog opens
      setSelectedPlatforms([...initialSelectedPlatforms]);
    } else {
      // Reset when dialog closes
      setSelectedPlatforms([]);
    }
  }, [isVisible, initialSelectedPlatforms]);

  const handlePlatformToggle = (platform: Platform) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platform)) {
        return prev.filter((p) => p !== platform);
      } else {
        return [...prev, platform];
      }
    });
  };

  const handleCancel = () => {
    setSelectedPlatforms([]);
    onClose(); // No payload = cancelled
  };

  const handleDone = () => {
    if (selectedPlatforms.length > 0) {
      onClose({ platforms: [...selectedPlatforms] }); // With payload = success
      setSelectedPlatforms([]);
    } else {
      onClose(); // No platforms selected = cancelled
    }
  };

  return (
    <Dialog
      isVisible={isVisible}
      onBackdropPress={handleCancel}
      overlayStyle={{
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
      }}
    >
      <Dialog.Title title="Select Platforms" titleStyle={{ color: theme.colors.onSurface }} />

      <View style={{ gap: 8 }}>
        {availablePlatforms.map((platform) => {
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

              <View>
                <Switch
                  value={isSelected}
                  onValueChange={() => handlePlatformToggle(platform)}
                  color="primary"
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 30, justifyContent: 'flex-end' }}>
        <Button title="Cancel" onPress={handleCancel} color="secondary" type="outline" />
        <Button title="Done" onPress={handleDone} color="primary" />
      </View>
    </Dialog>
  );
}
