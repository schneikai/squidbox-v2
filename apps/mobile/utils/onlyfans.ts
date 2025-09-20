import * as SecureStore from 'expo-secure-store';

type OnlyFansUser = Readonly<{
  id: string;
  username: string;
  displayName?: string;
}>;


/**
 * Handle OAuth callback
 */
export const handleCallback = async (): Promise<OnlyFansUser> => {
  // TODO: Implement actual OnlyFans OAuth flow
  // For now, return a dummy user
  const dummyUser: OnlyFansUser = {
    id: 'dummy-onlyfans-id',
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
  await SecureStore.setItemAsync('onlyfans_tokens', JSON.stringify(tokens));

  return dummyUser;
};

