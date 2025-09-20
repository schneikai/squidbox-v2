import * as SecureStore from 'expo-secure-store';

type BlueskyUser = Readonly<{
  id: string;
  username: string;
  displayName?: string;
}>;


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

