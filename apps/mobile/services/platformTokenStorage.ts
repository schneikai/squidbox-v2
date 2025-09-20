import * as SecureStore from 'expo-secure-store';
import { type Platform, PLATFORM_CONFIGS } from '@squidbox/contracts';

export type PlatformAuthTokens = Readonly<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  username?: string;
  userId?: string;
}>;

const TOKEN_STORAGE_KEY = 'auth_tokens';


// Heads-up! There is also backend.ts storePlatformAuthTokens and getPlatformAuthTokens that are used to
// store and retrieve tokens from the backend. Maybe we should create a service that combines both.


/**
 * Get stored platform tokens for a specific platform
 */
export const getPlatformTokens = async (platform: Platform): Promise<PlatformAuthTokens | null> => {
  try {
    const key = `${TOKEN_STORAGE_KEY}_${platform}`;
    const tokenData = await SecureStore.getItemAsync(key);

    if (!tokenData) {
      return null;
    }

    const tokens = JSON.parse(tokenData) as PlatformAuthTokens;
    console.log(`Retrieved platform tokens for ${platform}`);
    return tokens;
  } catch (error) {
    console.error(`Failed to retrieve platform tokens for ${platform}:`, error);
    return null;
  }
};

/**
 * Store platform tokens for a specific platform
 */
export const storePlatformTokens = async (platform: Platform, tokens: PlatformAuthTokens): Promise<void> => {
  try {
    const key = `${TOKEN_STORAGE_KEY}_${platform}`;
    const tokenData = JSON.stringify(tokens);
    await SecureStore.setItemAsync(key, tokenData);
    console.log(`Stored platform tokens for ${platform}`);
  } catch (error) {
    console.error(`Failed to store platform tokens for ${platform}:`, error);
    throw error;
  }
};

/**
 * Clear platform tokens for a specific platform
 */
export const clearPlatformTokens = async (platform: Platform): Promise<void> => {
  try {
    const key = `${TOKEN_STORAGE_KEY}_${platform}`;
    await SecureStore.deleteItemAsync(key);
    console.log(`Cleared platform tokens for ${platform}`);
  } catch (error) {
    console.error(`Failed to clear platform tokens for ${platform}:`, error);
    throw error;
  }
};

/**
 * Clear all platform tokens
 */
export const clearAllPlatformTokens = async (): Promise<void> => {
  const platforms: Platform[] = Object.keys(PLATFORM_CONFIGS) as Platform[];

  for (const platform of platforms) {
    await clearPlatformTokens(platform);
  }
};
