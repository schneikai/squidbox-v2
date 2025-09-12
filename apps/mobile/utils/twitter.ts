import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';

// Import API functions from subdirectory
import {
  createTweet as createTweetAPI,
  exchangeCodeForTokens,
  getTwitterUser as getTwitterUserAPI,
  initializeTwitterAuth as initializeTwitterAuthAPI,
  uploadMediaToTwitter,
  type TwitterPostResult,
  type TwitterUser,
} from './twitter-api';

// Storage keys
const ACCESS_TOKEN_KEY = 'twitter_access_token';
const REFRESH_TOKEN_KEY = 'twitter_refresh_token';
const CODE_VERIFIER_KEY = 'twitter_code_verifier';
const USER_INFO_KEY = 'twitter_user_info';

export interface TwitterAuthResult {
  success: boolean;
  user?: TwitterUser;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}

/**
 * Initialize Twitter authentication for the app
 */
export const initializeTwitterAuthApp = async (): Promise<AuthSession.AuthRequest> => {
  const request = await initializeTwitterAuthAPI();

  // Store the code verifier that AuthSession generated
  if (request.codeVerifier) {
    await SecureStore.setItemAsync(CODE_VERIFIER_KEY, request.codeVerifier);
    console.log('Stored code verifier:', request.codeVerifier);
  }

  return request;
};

/**
 * Handle Twitter OAuth callback and exchange code for tokens
 */
export const handleTwitterCallback = async (url: string): Promise<TwitterAuthResult> => {
  try {
    // Parse the URL to get the authorization code
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const code = urlParams.get('code');

    if (!code) {
      return { success: false, error: 'No authorization code received' };
    }

    // Get the stored code verifier
    const codeVerifier = await SecureStore.getItemAsync(CODE_VERIFIER_KEY);
    if (!codeVerifier) {
      return {
        success: false,
        error: 'Code verifier not found. Please try signing in again.',
      };
    }

    console.log('Retrieved code verifier:', codeVerifier);
    console.log('Authorization code:', code);

    // Exchange code for tokens
    const tokenResult = await exchangeCodeForTokens(code, codeVerifier);

    // Get user info
    const user = await getTwitterUserAPI(tokenResult.accessToken);

    // Cache user info
    await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));

    return {
      success: true,
      user,
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      expiresIn: tokenResult.expiresIn,
    };
  } catch (error) {
    console.error('Twitter callback error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Handle OAuth callback with code (for unified platform interface)
 */
export const handleCallback = async (
  code: string,
): Promise<{ id: string; username: string; displayName?: string }> => {
  // Get the stored code verifier
  const codeVerifier = await SecureStore.getItemAsync(CODE_VERIFIER_KEY);
  if (!codeVerifier) {
    throw new Error('Code verifier not found. Please try signing in again.');
  }

  console.log('Retrieved code verifier:', codeVerifier);
  console.log('Authorization code:', code);

  // Exchange code for tokens
  const tokenResult = await exchangeCodeForTokens(code, codeVerifier);

  // Store tokens
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokenResult.accessToken);
  if (tokenResult.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokenResult.refreshToken);
  }

  // Get user info
  const user = await getTwitterUserAPI(tokenResult.accessToken);

  // Cache user info
  await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));

  return {
    id: user.id,
    username: user.username,
    displayName: user.name,
  };
};

/**
 * Get Twitter user from cache only (no API call)
 */
export const getCachedUser = async (): Promise<TwitterUser | null> => {
  try {
    const userInfo = await SecureStore.getItemAsync(USER_INFO_KEY);
    return userInfo ? JSON.parse(userInfo) : null;
  } catch (error) {
    console.error('Error getting cached user:', error);
    return null;
  }
};

/**
 * Get Twitter user with API call and cache the result
 */
export const getTwitterUser = async (): Promise<TwitterUser | null> => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return null;
    }

    const user = await getTwitterUserAPI(accessToken);

    // Cache the user info
    await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));

    return user;
  } catch (error) {
    console.error('Error getting Twitter user:', error);

    // If API call fails, try to return cached user
    const cachedUser = await getCachedUser();
    if (cachedUser) {
      console.log('Returning cached user due to API error');
      return cachedUser;
    }

    return null;
  }
};

/**
 * Check if user is connected (uses cache to avoid API calls)
 */
export const isConnected = async (): Promise<boolean> => {
  try {
    // First check if we have cached user info
    const cachedUser = await getCachedUser();
    if (cachedUser) {
      return true;
    }

    // If no cached user, check if we have an access token
    const accessToken = await getAccessToken();
    return !!accessToken;
  } catch (error) {
    console.error('Error checking sign-in status:', error);
    return false;
  }
};

/**
 * Refresh authentication status by making an API call
 */
export const refreshAuthStatus = async (): Promise<TwitterUser | null> => {
  return await getTwitterUser();
};

/**
 * Sign out (clear all stored data)
 */
export const signOut = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_INFO_KEY);
  await SecureStore.deleteItemAsync(CODE_VERIFIER_KEY);
};

/**
 * Get stored access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
};

/**
 * Create a tweet with optional media
 * Supports up to 4 images or 1 video
 */
export const createTweetWithMedia = async (
  text: string,
  mediaUris?: string[],
): Promise<TwitterPostResult> => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Not authenticated with Twitter' };
    }

    console.log('Creating tweet with text:', text);
    console.log('Media URIs provided:', mediaUris);

    let mediaIds: string[] | undefined;

    // Upload media if provided
    if (mediaUris && mediaUris.length > 0) {
      // Validate media rules: max 4 images or 1 video
      if (mediaUris.length > 4) {
        return {
          success: false,
          error: 'Maximum 4 media items allowed per tweet',
        };
      }

      console.log('Attempting to upload media...');

      try {
        const uploadPromises = mediaUris.map((uri) => uploadMediaToTwitter(uri));
        const uploadResults = await Promise.all(uploadPromises);

        // Check media type rules
        const videos = uploadResults.filter((result) => result.mediaType === 'video');
        const images = uploadResults.filter((result) => result.mediaType === 'image');

        if (videos.length > 1) {
          return { success: false, error: 'Only 1 video allowed per tweet' };
        }

        if (videos.length === 1 && images.length > 0) {
          return {
            success: false,
            error: 'Cannot mix videos and images in the same tweet',
          };
        }

        mediaIds = uploadResults.map((result) => result.mediaId);
        console.log('Media uploaded successfully, media IDs:', mediaIds);
      } catch (error) {
        console.error('Media upload error:', error);
        return {
          success: false,
          error: `Failed to upload media: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }

    // Create the tweet
    const result = await createTweetAPI(accessToken, text, mediaIds);

    // Handle unauthorized errors by clearing auth data
    if (result.errorType === 'unauthorized') {
      await signOut();
    }

    return result;
  } catch (error) {
    console.error('Error creating tweet with media:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorType: 'other',
    };
  }
};
