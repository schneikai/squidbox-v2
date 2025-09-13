import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import {
  createTweet as createTweetAPI,
  getTwitterUser as getTwitterUserAPI,
  uploadMediaToTwitter,
  type TwitterPostResult,
  type TwitterUser,
  type CreateTweetRequest,
  type UploadMediaRequest,
} from '@squidbox/twitter-api';
import { getPlatformTokens, clearPlatformTokens } from '@/services/platformTokenStorage';

// Twitter OAuth 2.0 configuration
const TWITTER_CLIENT_ID = process.env.EXPO_PUBLIC_TWITTER_CLIENT_ID || '';
const TWITTER_CLIENT_SECRET = process.env.EXPO_PUBLIC_TWITTER_CLIENT_SECRET || '';
const TWITTER_CALLBACK_URL =
  process.env.EXPO_PUBLIC_TWITTER_CALLBACK_URL || 'squidboxsocial://auth';

// Storage keys
const CODE_VERIFIER_KEY = 'twitter_code_verifier';

/**
 * Initialize Twitter OAuth 2.0 authentication
 */
const initializeTwitterAuth = async (): Promise<AuthSession.AuthRequest> => {
  // Validate required configuration
  if (!TWITTER_CLIENT_ID) {
    throw new Error(
      'Twitter Client ID is not configured. Please set EXPO_PUBLIC_TWITTER_CLIENT_ID in your .env file.',
    );
  }

  // Use the configured callback URL or fallback to the app scheme
  const redirectUri =
    TWITTER_CALLBACK_URL ||
    AuthSession.makeRedirectUri({
      scheme: 'squidboxsocial',
      path: 'auth',
    });

  console.log('Redirect URI:', redirectUri);

  const request = new AuthSession.AuthRequest({
    clientId: TWITTER_CLIENT_ID,
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
  });

  // Generate the authorization URL and PKCE values
  await request.makeAuthUrlAsync({
    authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize',
  });

  return request;
};

/**
 * Exchange authorization code for access and refresh tokens
 */
const exchangeCodeForTokens = async (
  code: string,
  codeVerifier: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> => {
  const redirectUri =
    TWITTER_CALLBACK_URL ||
    AuthSession.makeRedirectUri({
      scheme: 'squidboxsocial',
      path: 'auth',
    });

  const response = await AuthSession.exchangeCodeAsync(
    {
      clientId: TWITTER_CLIENT_ID,
      clientSecret: TWITTER_CLIENT_SECRET,
      code: code,
      redirectUri: redirectUri,
      extraParams: {
        code_verifier: codeVerifier,
      },
    },
    {
      tokenEndpoint: 'https://api.twitter.com/2/oauth2/token',
    },
  );

  if (!response.accessToken) {
    throw new Error('Failed to get access token from Twitter');
  }

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken || '',
    expiresIn: response.expiresIn || 7200,
  };
};

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
  const request = await initializeTwitterAuth();

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

  // Tokens are now stored in unified storage via the platform auth system
  // Get user info
  const user = await getTwitterUserAPI(tokenResult.accessToken);

  return {
    id: user.id,
    username: user.username,
    displayName: user.name,
  };
};

/**
 * Check if user is connected (uses platform auth storage)
 */
export const isConnected = async (): Promise<boolean> => {
  try {
    const tokens = await getPlatformTokens('twitter');
    return !!tokens?.accessToken;
  } catch (error) {
    console.error('Error checking sign-in status:', error);
    return false;
  }
};


/**
 * Get Twitter user with API call and cache the result
 */
export const getUser = async (): Promise<TwitterUser | null> => {
  try {
    const accessToken = await getAccessToken();
    console.log('Access token:', accessToken);

    if (!accessToken) {
      return null;
    }

    const user = await getTwitterUserAPI(accessToken);

    console.log('Twitter user:', user);

    // User info is now stored in unified storage via the platform auth system

    return user;
  } catch (error) {
    console.error('Error getting Twitter user:', error);
    return null;
  }
};

/**
 * Get Twitter user from cache only (no API call)
 */
export const getCachedUser = async (): Promise<TwitterUser | null> => {
  try {
    // Get from platform auth storage
    const tokens = await getPlatformTokens('twitter');
    if (tokens?.username && tokens?.userId) {
      return {
        id: tokens.userId,
        username: tokens.username,
        name: tokens.username, // Use username as display name if no separate name stored
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached user:', error);
    return null;
  }
};


/**
 * Refresh authentication status by making an API call
 */
export const refreshAuthStatus = async (): Promise<TwitterUser | null> => {
  console.log('Refreshing Twitter auth status');
  
  const user = await getUser();
  
  // If getTwitterUser returns null, it means the API call failed
  // (likely due to invalid/expired token), so clear cached data
  if (!user) {
    console.log('API call failed, clearing cached data');
    await signOut();
  }
  
  return user;
};

/**
 * Sign out (clear all stored data from platform auth storage)
 */
export const signOut = async (): Promise<void> => {
  // Clear platform auth storage
  await clearPlatformTokens('twitter');
  
  // Clear code verifier (still needed for OAuth flow)
  await SecureStore.deleteItemAsync(CODE_VERIFIER_KEY);
};

/**
 * Get stored access token (from platform auth storage)
 */
export const getAccessToken = async (): Promise<string | null> => {
  const tokens = await getPlatformTokens('twitter');
  return tokens?.accessToken || null;
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
        // Convert URIs to File/Blob objects for the new API
        const uploadPromises = mediaUris.map(async (uri) => {
          const response = await fetch(uri);
          const blob = await response.blob();
          
          // Determine media type from blob
          const isVideo = blob.type.startsWith('video/');
          const mediaType = isVideo ? 'video/mp4' : blob.type as 'image/jpeg' | 'image/png' | 'image/gif';
          
          const uploadRequest: UploadMediaRequest = {
            file: blob,
            mediaType,
          };
          
          const result = await uploadMediaToTwitter(accessToken, uploadRequest);
          return { ...result, mediaType: isVideo ? 'video' : 'image' };
        });
        
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

        mediaIds = uploadResults.map((result) => result.mediaId).filter((id): id is string => id !== undefined);
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
    const request: CreateTweetRequest = {
      text,
      mediaIds,
    };
    
    const result = await createTweetAPI(accessToken, request);

    return result;
  } catch (error) {
    console.error('Error creating tweet with media:', error);
    
    // Handle unauthorized errors by clearing auth data
    if (error instanceof Error && (error as any).errorType === 'unauthorized') {
      await signOut();
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorType: (error as any).errorType || 'other',
    };
  }
};
