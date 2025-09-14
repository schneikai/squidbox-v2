import { type Platform } from '@squidbox/contracts';
import * as bluesky from './bluesky';
import * as jff from './jff';
import * as onlyfans from './onlyfans';
import * as twitter from './twitter';

export type PlatformUser = Readonly<{
  id: string;
  username: string;
  displayName?: string;
}>;

const platformProviders = {
  twitter,
  bluesky,
  onlyfans,
  jff,
} as const;


/**
 * Returns true if the user has a valid access token for the platform
 * This does not make an API call to the platform, it only checks if the access token is present in the platform auth storage
 */
export async function isConnected(platform: Platform): Promise<boolean> {
  try {
    const provider = getProvider(platform);
    return await provider.isConnected();
  } catch (error) {
    console.error(`PlatformService.isConnected: Error checking connection for ${platform}:`, error);
    return false;
  }
}

/**
 * Get cached user info for a platform
 * This does not make an API call to the platform, it only returns the cached user info from the platform auth storage
 */
export async function getCachedUser(platform: Platform): Promise<PlatformUser | null> {
  try {
    const provider = getProvider(platform);
    return await provider.getCachedUser();
  } catch (error) {
    console.error(`PlatformService.getCachedUser: Error getting cached user for ${platform}:`, error);
    return null;
  }
}

/**
 * Sign out from a platform
 * This deletes the access token from the platform auth storage
 */
export async function signOut(platform: Platform): Promise<void> {
  try {
    const provider = getProvider(platform);
    await provider.signOut();
  } catch (error) {
    console.error(`PlatformService.signOut: Error signing out from ${platform}:`, error);
    throw error;
  }
}

/**
 * Handle OAuth callback for a platform
 */
export async function handleCallback(platform: Platform, code: string): Promise<PlatformUser> {
  try {
    const provider = getProvider(platform);
    return await provider.handleCallback(code);
  } catch (error) {
    console.error(`PlatformService.handleCallback: Error handling callback for ${platform}:`, error);
    throw error;
  }
}

/**
 * Refresh authentication status
 * This makes an API call to the platform to validate the access token
 * If response from platform is 401 unauthorized, it deletes the access token from the platform auth storage
 * Other network errors are ignored to make it offline-friendly
 */
export async function refreshAuthStatus(platform: Platform): Promise<void> {
  try {
    const provider = getProvider(platform);
    // Check if the provider has a refreshAuthStatus function
    if ('refreshAuthStatus' in provider && typeof provider.refreshAuthStatus === 'function') {
      console.log(`PlatformService.refreshAuthStatus: Refreshing auth status for ${platform}`);
      await provider.refreshAuthStatus();
    } else {
     console.log(`PlatformService.refreshAuthStatus: Provider ${platform} does not have a refreshAuthStatus function`);
    }
  } catch (error) {
    console.error(`PlatformService.refreshAuthStatus: Error refreshing auth status for ${platform}:`, error);
  }
}

function getProvider(platform: Platform) {
  return platformProviders[platform];
}