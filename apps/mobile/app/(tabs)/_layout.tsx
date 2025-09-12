import { useTheme } from '@rneui/themed';
import { Tabs } from 'expo-router';
import React from 'react';

import Icon from '@/components/atoms/Icon';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <ProtectedRoute>
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: (theme.colors as any).grey3,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: (theme.colors as any).background,
          borderTopColor: (theme.colors as any).greyOutline,
        },
        sceneStyle: {
          backgroundColor: (theme.colors as any).background,
        },
      }}
    >
      <Tabs.Screen
        name="compose"
        options={{
          title: 'Compose',
          tabBarIcon: ({ color }) => (
            <Icon name="edit-2" type="feather" size={20} color={color as any} />
          ),
        }}
      />
      <Tabs.Screen
        name="platforms"
        options={{
          title: 'Platforms',
          tabBarIcon: ({ color }) => (
            <Icon name="share-2" type="feather" size={20} color={color as any} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <Icon name="settings" type="feather" size={20} color={color as any} />
          ),
        }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}
