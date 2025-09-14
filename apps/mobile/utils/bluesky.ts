import * as SecureStore from 'expo-secure-store';

export type BlueskyUser = Readonly<{
  id: string;
  username: string;
  displayName?: string;
}>;

export type BlueskyTokens = Readonly<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}>;

/**
 * Check if user is connected
 */
export const isConnected = async (): Promise<boolean> => {
  try {
    const tokensJson = await SecureStore.getItemAsync('bluesky_tokens');
    if (!tokensJson) return false;

    const tokens = JSON.parse(tokensJson);
    return !!tokens?.accessToken;
  } catch (error) {
    console.log('Bluesky not connected:', error);
    return false;
  }
};

/**
 * Get cached user info
 */
export const getCachedUser = async (): Promise<BlueskyUser | null> => {
  try {
    const tokensJson = await SecureStore.getItemAsync('bluesky_tokens');
    if (!tokensJson) return null;

    const tokens = JSON.parse(tokensJson);
    if (!tokens?.username || !tokens?.userId) {
      return null;
    }

    return {
      id: tokens.userId,
      username: tokens.username,
      displayName: tokens.displayName,
    };
  } catch (error) {
    console.log('Failed to get cached Bluesky user:', error);
    return null;
  }
};

/**
 * Sign out
 */
export const signOut = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync('bluesky_tokens');
  } catch (error) {
    console.error('Failed to sign out from Bluesky:', error);
    throw error;
  }
};

/**
 * Handle OAuth callback
 */
export const handleCallback = async (): Promise<BlueskyUser> => {
  // TODO: Implement actual Bluesky OAuth flow
  // For now, return a dummy user
  const dummyUser: BlueskyUser = {
    id: 'dummy-bluesky-id',
    username: 'dummyuser',
    displayName: 'Dummy User',
  };

  // Store dummy tokens
  const tokens = {
    accessToken: 'dummy-access-token',
    refreshToken: 'dummy-refresh-token',
    expiresIn: 3600,
    username: dummyUser.username,
    userId: dummyUser.id,
    displayName: dummyUser.displayName,
  };
  await SecureStore.setItemAsync('bluesky_tokens', JSON.stringify(tokens));

  return dummyUser;
};

/**
 * Refresh authentication status by making an API call
 * TODO: Implement actual API validation when Bluesky OAuth is ready
 */
export const refreshAuthStatus = async (): Promise<void> => {
  try {
    // For now, just validate cached user since we don't have real API integration
    // In the future, this should make an API call to validate the token
    await getCachedUser();
  } catch (error) {
    console.error('Error refreshing Bluesky auth status:', error);
  }
};
