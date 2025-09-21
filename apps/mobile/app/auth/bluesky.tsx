import Icon from '@/components/atoms/Icon';
import { useAuthVerification } from '@/hooks/useAuthVerification';
import { usePlatformContext } from '@/contexts/PlatformContext';
import { handleCallback } from '@/utils/platformService';
import { Button, Text, useTheme } from '@rneui/themed';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

export default function BlueskyAuthPage() {
  const { theme } = useTheme();
  const { ensureAuth } = useAuthVerification();
  const { onPlatformConnected } = usePlatformContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleBlueskyLogin = useCallback(async () => {
    // Verify user is authenticated before starting OAuth flow
    if (!(await ensureAuth())) return;

    setIsLoading(true);
    try {
      // TODO: Implement Bluesky OAuth flow
      // For now, show a placeholder message
      Alert.alert(
        'Coming Soon',
        'Bluesky authentication is not yet implemented. This feature will be available in a future update.',
        [
          { text: 'OK', onPress: () => router.back() }
        ]
      );
    } catch (error) {
      console.error('Failed to start Bluesky authentication:', error);
      Alert.alert('Error', 'Failed to start Bluesky authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [ensureAuth]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Icon name="cloud" type="feather" size={64} color="#00A8E8" style={styles.icon} />

        <Text h3 style={[styles.title, { color: theme.colors.black }]}>
          Connect to Bluesky
        </Text>

        <Text style={[styles.description, { color: theme.colors.grey2 }]}>
          Authorize SquidboxSocial to post on your behalf. Your credentials are stored securely and
          only used for posting content.
        </Text>

        <Button
          title="Connect to Bluesky"
          onPress={handleBlueskyLogin}
          loading={isLoading}
          disabled={isLoading}
          buttonStyle={[styles.button, { backgroundColor: '#00A8E8' }]}
          titleStyle={styles.buttonTitle}
        />

        <Button
          title="Cancel"
          onPress={() => router.back()}
          type="outline"
          buttonStyle={styles.cancelButton}
          titleStyle={[styles.cancelButtonTitle, { color: theme.colors.grey2 }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 12,
    paddingVertical: 16,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
  },
  cancelButtonTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
});
