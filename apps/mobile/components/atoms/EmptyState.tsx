import { useTheme } from '@rneui/themed';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Icon from './Icon';

type EmptyStateProps = {
  icon: string;
  title: string;
  description: string;
};

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Icon 
        name={icon} 
        type="feather" 
        size={48} 
        color={theme.colors.grey3} 
      />
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>
        {title}
      </Text>
      <Text style={[styles.description, { color: theme.colors.grey3 }]}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
