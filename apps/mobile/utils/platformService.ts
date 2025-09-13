import { type Platform } from '@squidbox/contracts';
import * as bluesky from './bluesky';
import * as jff from './jff';
import * as onlyfans from './onlyfans';
import * as twitter from './twitter';

type PlatformUser = Readonly<{
  id: string;
  username: string;
  displayName?: string;
}>;

/**
 * Platform providers registry
 */
const platformProviders = {
  twitter,
  bluesky,
  onlyfans,
  jff,
} as const;

/**
 * Unified platform service that provides the same API for all platforms
 */
export class PlatformService {
  /**
   * Check if user is connected to a platform
   */
  static async isConnected(platform: Platform): Promise<boolean> {
    const provider = platformProviders[platform];
    if (!provider) {
      console.warn(`No provider found for platform: ${platform}`);
      return false;
    }

    try {
      return await provider.isConnected();
    } catch (error) {
      console.error(`Error checking connection for ${platform}:`, error);
      return false;
    }
  }

  /**
   * Get cached user info for a platform
   */
  static async getCachedUser(platform: Platform): Promise<PlatformUser | null> {
    const provider = platformProviders[platform];
    if (!provider) {
      console.warn(`No provider found for platform: ${platform}`);
      return null;
    }

    try {
      return await provider.getCachedUser();
    } catch (error) {
      console.error(`Error getting cached user for ${platform}:`, error);
      return null;
    }
  }

  /**
   * Sign out from a platform
   */
  static async signOut(platform: Platform): Promise<void> {
    const provider = platformProviders[platform];
    if (!provider) {
      throw new Error(`No provider found for platform: ${platform}`);
    }

    try {
      await provider.signOut();
    } catch (error) {
      console.error(`Error signing out from ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Handle OAuth callback for a platform
   */
  static async handleCallback(platform: Platform, code: string): Promise<PlatformUser> {
    const provider = platformProviders[platform];
    if (!provider) {
      throw new Error(`No provider found for platform: ${platform}`);
    }

    try {
      return await provider.handleCallback(code);
    } catch (error) {
      console.error(`Error handling callback for ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Refresh authentication status by making an API call to validate tokens
   */
  static async refreshAuthStatus(platform: Platform): Promise<PlatformUser | null> {
    const provider = platformProviders[platform];
    if (!provider) {
      console.warn(`No provider found for platform: ${platform}`);
      return null;
    }

    try {
      // Check if the provider has a refreshAuthStatus function
      if ('refreshAuthStatus' in provider && typeof provider.refreshAuthStatus === 'function') {
        return await provider.refreshAuthStatus();
      } else {
        // Fallback to checking cached user if no refresh function available
        console.log(`No refreshAuthStatus function for ${platform}, using cached user`);
        return await this.getCachedUser(platform);
      }
    } catch (error) {
      console.error(`Error refreshing auth status for ${platform}:`, error);
      return null;
    }
  }
}
