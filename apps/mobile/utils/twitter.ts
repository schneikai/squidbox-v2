import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import {
  getTwitterUser,
} from '@squidbox/twitter-api';
import { storePlatformAuthTokens } from '@/services/backend';
import { type PlatformUser } from './platformService';

// Twitter OAuth 2.0 configuration
const TWITTER_CLIENT_ID = process.env.EXPO_PUBLIC_TWITTER_CLIENT_ID || '';
const TWITTER_CLIENT_SECRET = process.env.EXPO_PUBLIC_TWITTER_CLIENT_SECRET || '';
const TWITTER_CALLBACK_URL =
  process.env.EXPO_PUBLIC_TWITTER_CALLBACK_URL || 'squidboxsocial://auth';

// Storage keys
const CODE_VERIFIER_KEY = 'twitter_code_verifier';

/**
 * Initialize OAuth 2.0 authentication
 */
export const initializeAuth = async (): Promise<AuthSession.AuthRequest> => {
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
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'media.write'],
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
  });

  // Generate the authorization URL and PKCE values
  await request.makeAuthUrlAsync({
    authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize',
  });

  // Store the code verifier that AuthSession generated
  if (request.codeVerifier) {
    await SecureStore.setItemAsync(CODE_VERIFIER_KEY, request.codeVerifier);
    console.log('Stored code verifier:', request.codeVerifier);
  }

  console.log('Request:', request);

  return request;
};

/**
 * Handle OAuth callback with code (for unified platform interface)
 */
export const handleCallback = async (
  code: string,
): Promise<{ id: string; username: string; displayName?: string }> => {
  console.log('Twitter handleCallback: Starting with code:', code);
  
  // Get the stored code verifier
  const codeVerifier = await SecureStore.getItemAsync(CODE_VERIFIER_KEY);
  if (!codeVerifier) {
    console.error('Twitter handleCallback: Code verifier not found');
    throw new Error('Code verifier not found. Please try signing in again.');
  }

  console.log('Twitter handleCallback: Retrieved code verifier:', codeVerifier);
  console.log('Twitter handleCallback: Authorization code:', code);

  // Exchange code for tokens
  console.log('Twitter handleCallback: Exchanging code for tokens');
  const tokenResult = await exchangeCodeForTokens(code, codeVerifier);
  console.log('Twitter handleCallback: Got token result:', { 
    hasAccessToken: !!tokenResult.accessToken, 
    hasRefreshToken: !!tokenResult.refreshToken,
    expiresIn: tokenResult.expiresIn 
  });

  // Get user info
  console.log('Twitter handleCallback: Getting user info');
  const user = await getTwitterUser(tokenResult.accessToken);
  console.log('Twitter handleCallback: Got user info:', { id: user.id, username: user.username });

  // Persist tokens in backend
  console.log('Twitter handleCallback: Storing tokens in backend');
  const tokenData = {
    platform: 'twitter' as const,
    accessToken: tokenResult.accessToken,
    refreshToken: tokenResult.refreshToken,
    expiresIn: tokenResult.expiresIn,
    username: user.username,
    platformUserId: user.id,
  };
  console.log('Twitter handleCallback: Token data to store:', tokenData);
  
  await storePlatformAuthTokens(tokenData);
  console.log('Twitter handleCallback: Successfully stored tokens in backend');

  return {
    id: user.id,
    username: user.username,
    displayName: user.name,
  };
};

/**
 * Check if user is connected (now handled by backend)
 * This method is kept for compatibility but should not be used directly
 */
export const isConnected = async (): Promise<boolean> => {
  console.warn('Twitter.isConnected: This method is deprecated. Use platformService.isConnected instead.');
  return false;
};

/**
 * Get Twitter user from cache only (now handled by backend)
 * This method is kept for compatibility but should not be used directly
 */
export const getCachedUser = async (): Promise<PlatformUser | null> => {
  console.warn('Twitter.getCachedUser: This method is deprecated. Use platformService.getCachedUser instead.');
  return null;
};


/**
 * Refresh authentication status (now handled by backend)
 * This method is kept for compatibility but should not be used directly
 */
export const refreshAuthStatus = async (): Promise<void> => {
  console.warn('Twitter.refreshAuthStatus: This method is deprecated. Use platformService.refreshAuthStatus instead.');
};

/**
 * Sign out (now handled by backend)
 * This method is kept for compatibility but should not be used directly
 */
export const signOut = async (): Promise<void> => {
  console.warn('Twitter.signOut: This method is deprecated. Sign out is now handled by the backend.');
  
  // Clear code verifier (still needed for OAuth flow)
  await SecureStore.deleteItemAsync(CODE_VERIFIER_KEY);
};


// Helpers

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