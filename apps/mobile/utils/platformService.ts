import { type Platform } from '@squidbox/contracts';
import { getPlatformStatus, disconnectPlatform } from '../services/backend';

export type PlatformUser = Readonly<{
  id: string;
  username: string;
  displayName?: string;
}>;

export type PlatformStatus = Readonly<{
  platform: string;
  isConnected: boolean;
  username: string | null;
  expiresAt: string | null;
}>;

// Cache for platform status to avoid repeated API calls
let platformStatusCache: PlatformStatus[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Returns true if the user has a valid access token for the platform
 * This checks with the backend to get the current connection status
 */
export async function isConnected(platform: Platform): Promise<boolean> {
  try {
    const statuses = await getPlatformStatuses();
    const platformStatus = statuses.find(p => p.platform === platform);
    return platformStatus?.isConnected || false;
  } catch (error) {
    console.error(`PlatformService.isConnected: Error checking connection for ${platform}:`, error);
    return false;
  }
}

/**
 * Get all platform connection statuses from backend
 */
export async function getPlatformStatuses(forceRefresh: boolean = false): Promise<PlatformStatus[]> {
  const now = Date.now();
  
  // Return cached data if still valid and not forcing refresh
  if (!forceRefresh && platformStatusCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return platformStatusCache;
  }

  try {
    const response = await getPlatformStatus();
    if (response.data) {
      platformStatusCache = response.data;
      cacheTimestamp = now;
      return response.data;
    }
    
    // If API call fails, return cached data if available
    if (platformStatusCache) {
      console.warn('PlatformService.getPlatformStatuses: API call failed, returning cached data');
      return platformStatusCache;
    }
    
    // If no cached data, return empty array
    return [];
  } catch (error) {
    console.error('PlatformService.getPlatformStatuses: Error fetching platform statuses:', error);
    
    // Return cached data if available
    if (platformStatusCache) {
      console.warn('PlatformService.getPlatformStatuses: Error occurred, returning cached data');
      return platformStatusCache;
    }
    
    return [];
  }
}

/**
 * Get user info for a platform from backend
 */
export async function getCachedUser(platform: Platform): Promise<PlatformUser | null> {
  try {
    const statuses = await getPlatformStatuses();
    const platformStatus = statuses.find(p => p.platform === platform);
    
    if (platformStatus?.isConnected && platformStatus.username) {
      return {
        id: platformStatus.username, // Use username as ID for now
        username: platformStatus.username,
        displayName: platformStatus.username,
      };
    }
    
    return null;
  } catch (error) {
    console.error(`PlatformService.getCachedUser: Error getting user for ${platform}:`, error);
    return null;
  }
}

/**
 * Clear platform status cache to force refresh from backend
 */
export function clearPlatformStatusCache(): void {
  platformStatusCache = null;
  cacheTimestamp = 0;
}

/**
 * Refresh authentication status by clearing cache and fetching fresh data
 */
export async function refreshAuthStatus(platform: Platform): Promise<void> {
  try {
    console.log(`PlatformService.refreshAuthStatus: Refreshing auth status for ${platform}`);
    clearPlatformStatusCache();
    await getPlatformStatuses(true);
  } catch (error) {
    console.error(`PlatformService.refreshAuthStatus: Error refreshing auth status for ${platform}:`, error);
  }
}

/**
 * Disconnect a platform by deleting its tokens from the backend
 */
export async function disconnectPlatformTokens(platform: Platform): Promise<void> {
  try {
    console.log(`PlatformService.disconnectPlatformTokens: Disconnecting ${platform}`);
    const response = await disconnectPlatform(platform);
    
    if (response.data?.success) {
      console.log(`PlatformService.disconnectPlatformTokens: Successfully disconnected ${platform}`);
      // Clear the cache to force refresh on next check
      clearPlatformStatusCache();
    } else {
      throw new Error(`Failed to disconnect ${platform}: ${response.data?.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`PlatformService.disconnectPlatformTokens: Error disconnecting ${platform}:`, error);
    throw error;
  }
}

/**
 * Handle OAuth callback for a platform
 * Routes to the appropriate platform-specific handler
 */
export async function handleCallback(platform: Platform, code: string): Promise<PlatformUser> {
  try {
    console.log(`PlatformService.handleCallback: Handling callback for ${platform}`);
    
    let result: PlatformUser;
    
    // Route to platform-specific handler
    switch (platform) {
      case 'twitter': {
        const { handleCallback: twitterHandleCallback } = await import('./twitter');
        result = await twitterHandleCallback(code);
        break;
      }
      case 'bluesky': {
        const { handleCallback: blueskyHandleCallback } = await import('./bluesky');
        result = await blueskyHandleCallback();
        break;
      }
      case 'onlyfans': {
        const { handleCallback: onlyfansHandleCallback } = await import('./onlyfans');
        result = await onlyfansHandleCallback();
        break;
      }
      case 'jff': {
        const { handleCallback: jffHandleCallback } = await import('./jff');
        result = await jffHandleCallback();
        break;
      }
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    console.log(`PlatformService.handleCallback: Successfully connected to ${platform}`);
    return result;
  } catch (error) {
    console.error(`PlatformService.handleCallback: Error handling callback for ${platform}:`, error);
    throw error;
  }
}