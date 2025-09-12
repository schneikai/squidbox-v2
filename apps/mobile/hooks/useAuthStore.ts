import * as SecureStore from 'expo-secure-store';
import { useCallback } from 'react';

import { type Platform } from '@/contexts/PlatformContext';

// Import platform configs to get the list of all platforms
const PLATFORM_CONFIGS = {
  twitter: { id: 'twitter' as Platform },
  bluesky: { id: 'bluesky' as Platform },
  onlyfans: { id: 'onlyfans' as Platform },
  jff: { id: 'jff' as Platform },
} as const;

export type AuthTokens = Readonly<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  username?: string;
  userId?: string;
}>;

const TOKEN_STORAGE_KEY = 'auth_tokens';

/**
 * Hook for managing OAuth tokens securely
 */
export const useAuthStore = () => {
  const storeTokens = useCallback(async (platform: Platform, tokens: AuthTokens) => {
    try {
      const key = `${TOKEN_STORAGE_KEY}_${platform}`;
      const tokenData = JSON.stringify(tokens);
      await SecureStore.setItemAsync(key, tokenData);
      console.log(`Stored tokens for ${platform}`);
    } catch (error) {
      console.error(`Failed to store tokens for ${platform}:`, error);
      throw error;
    }
  }, []);

  const getStoredTokens = useCallback(async (platform: Platform): Promise<AuthTokens | null> => {
    try {
      const key = `${TOKEN_STORAGE_KEY}_${platform}`;
      const tokenData = await SecureStore.getItemAsync(key);

      if (!tokenData) {
        return null;
      }

      const tokens = JSON.parse(tokenData) as AuthTokens;
      console.log(`Retrieved tokens for ${platform}`);
      return tokens;
    } catch (error) {
      console.error(`Failed to retrieve tokens for ${platform}:`, error);
      return null;
    }
  }, []);

  const clearTokens = useCallback(async (platform: Platform) => {
    try {
      const key = `${TOKEN_STORAGE_KEY}_${platform}`;
      await SecureStore.deleteItemAsync(key);
      console.log(`Cleared tokens for ${platform}`);
    } catch (error) {
      console.error(`Failed to clear tokens for ${platform}:`, error);
      throw error;
    }
  }, []);

  const getAllTokens = useCallback(async (): Promise<Record<Platform, AuthTokens | null>> => {
    const platforms: Platform[] = Object.keys(PLATFORM_CONFIGS) as Platform[];
    const tokens: Record<Platform, AuthTokens | null> = {
      twitter: null,
      bluesky: null,
      onlyfans: null,
      jff: null,
    };

    for (const platform of platforms) {
      tokens[platform] = await getStoredTokens(platform);
    }

    return tokens;
  }, [getStoredTokens]);

  const clearAllTokens = useCallback(async () => {
    const platforms: Platform[] = Object.keys(PLATFORM_CONFIGS) as Platform[];

    for (const platform of platforms) {
      await clearTokens(platform);
    }
  }, [clearTokens]);

  return {
    storeTokens,
    getStoredTokens,
    clearTokens,
    getAllTokens,
    clearAllTokens,
  };
};
