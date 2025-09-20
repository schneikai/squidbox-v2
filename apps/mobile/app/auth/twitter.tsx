import Icon from '@/components/atoms/Icon';
import { useAuthVerification } from '@/hooks/useAuthVerification';
import { usePlatformContext } from '@/contexts/PlatformContext';
import { initializeAuth } from '@/utils/twitter';
import { handleCallback } from '@/utils/platformService';
import { Button, Text, useTheme } from '@rneui/themed';
import * as AuthSession from 'expo-auth-session';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

// Complete the auth session for better UX
WebBrowser.maybeCompleteAuthSession();

// Twitter OAuth 2.0 configuration
// const TWITTER_CLIENT_ID = process.env.EXPO_PUBLIC_TWITTER_CLIENT_ID || '';
// const TWITTER_CALLBACK_URL =
//   process.env.EXPO_PUBLIC_TWITTER_CALLBACK_URL || 'squidboxsocial://auth';

const discovery = {
  authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize',
  tokenEndpoint: 'https://api.twitter.com/2/oauth2/token',
  revocationEndpoint: 'https://api.twitter.com/2/oauth2/revoke',
};

export default function TwitterAuthPage() {
  const { theme } = useTheme();
  const { ensureAuth } = useAuthVerification();
  const { onPlatformConnected } = usePlatformContext();
  const [isLoading, setIsLoading] = useState(false);
  const [request, setRequest] = useState<AuthSession.AuthRequest | null>(null);

  // Initialize the auth request when component mounts
  useEffect(() => {
    const initAuth = async () => {
      try {
        const authRequest = await initializeAuth();
        setRequest(authRequest);
      } catch (error) {
        console.error('Failed to initialize Twitter auth:', error);
        Alert.alert('Error', 'Failed to initialize Twitter authentication. Please check your configuration.');
      }
    };

    initAuth();
  }, []);

  const handleAuthSuccess = useCallback(
    async (url: string) => {
      try {
        setIsLoading(true);

        // Extract authorization code from the callback URL
        const queryString = url.split('?')[1] || '';
        const urlParams = new URLSearchParams(queryString);
        const code = urlParams.get('code');

        if (!code) {
          Alert.alert('Error', 'No authorization code received from Twitter.');
          return;
        }

        // Use unified platform interface to complete auth and persist tokens
        await handleCallback('twitter', code);

        // Notify the platform context that a platform was connected
        onPlatformConnected();

        Alert.alert('Success', 'Successfully connected to Twitter!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch (error) {
        console.error('Twitter authentication error:', error);
        Alert.alert('Error', 'An error occurred during Twitter authentication. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );


  const handleTwitterLogin = async () => {
    if (!request) {
      Alert.alert('Error', 'Authentication not initialized. Please check your configuration.');
      return;
    }

    // Verify user is authenticated before starting OAuth flow
    if (!(await ensureAuth())) return;

    setIsLoading(true);
    try {
      const result = await request.promptAsync(discovery);

      if (result.type === 'success' && result.url) {
        handleAuthSuccess(result.url);
      } else if (result.type === 'error') {
        Alert.alert('Error', 'Twitter authentication failed. Please try again.');
        setIsLoading(false);
      } else if (result.type === 'cancel') {
        Alert.alert('Cancelled', 'Twitter authentication was cancelled.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to start Twitter authentication:', error);
      Alert.alert('Error', 'Failed to start Twitter authentication. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Icon name="twitter" type="feather" size={64} color="#1DA1F2" style={styles.icon} />

        <Text h3 style={[styles.title, { color: theme.colors.black }]}>
          Connect to Twitter
        </Text>

        <Text style={[styles.description, { color: theme.colors.grey2 }]}>
          Authorize SquidboxSocial to post on your behalf. Your credentials are stored securely and
          only used for posting content.
        </Text>

        <Button
          title="Connect to Twitter"
          onPress={handleTwitterLogin}
          loading={isLoading}
          disabled={isLoading || !request}
          buttonStyle={[styles.button, { backgroundColor: '#1DA1F2' }]}
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
