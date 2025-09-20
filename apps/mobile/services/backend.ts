import type { 
  OAuthTokensCreate, 
  PlatformCredentialsCreate,
  PlatformCredentialsResponse,
  CreatePostRequest, 
  CreatePostResponse
} from '@squidbox/contracts';
export type { CreatePostRequest, CreatePostResponse } from '@squidbox/contracts';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { httpGet, httpPost, httpDelete, type ApiResponse } from './http';

type AuthTokensRequest = OAuthTokensCreate;

type AuthTokensResponse = Readonly<{
  success: boolean;
  message?: string;
}>;

// Auth types for HTTP calls only
type LoginRequest = {
  email: string;
  password: string;
};

type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
  };
};

type RegisterRequest = {
  email: string;
  password: string;
};

type RegisterResponse = {
  token: string;
  user: {
    id: string;
    email: string;
  };
};

// Get backend base URL
const getBackendBaseUrl = (): string => {
  const url = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';
  if (!url) {
    throw new Error(
      'Backend URL not configured. Please set EXPO_PUBLIC_BACKEND_URL in your .env file or backendUrl in app.json extra config.',
    );
  }
  return url;
};

// Get authentication headers for backend requests
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await SecureStore.getItemAsync('jwt_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper to construct full backend URLs
const getBackendUrl = (endpoint: string): string => {
  const baseUrl = getBackendBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

/**
 * Store platform OAuth tokens for a platform (Twitter, Bluesky, etc.)
 */
export const storePlatformAuthTokens = async (
  tokens: AuthTokensRequest,
): Promise<ApiResponse<AuthTokensResponse>> => {
  console.log('storePlatformAuthTokens: Storing tokens for platform:', tokens.platform);
  const url = getBackendUrl('/api/platforms/tokens');
  const headers = await getAuthHeaders();
  console.log('storePlatformAuthTokens: Making request to:', url);
  console.log('storePlatformAuthTokens: Headers:', headers);
  console.log('storePlatformAuthTokens: Tokens data:', tokens);
  return httpPost<AuthTokensResponse>(url, tokens, headers);
};

/**
 * Get stored platform OAuth tokens for a platform (Twitter, Bluesky, etc.)
 */
// const getPlatformAuthTokens = async (
//   platform: Platform,
// ): Promise<ApiResponse<AuthTokensRequest | null>> => {
//   const headers = await getAuthHeaders();
//   return httpGet<AuthTokensRequest | null>(
//     getBackendUrl(`/api/users/tokens/${platform}`),
//     headers,
//   );
// };

/**
 * Health check endpoint
 */
export const healthCheck = async (): Promise<
  ApiResponse<{ status: string; timestamp: string }>
> => {
  const headers = await getAuthHeaders();
  return httpGet<{ status: string; timestamp: string }>(getBackendUrl('/health'), headers);
};

/**
 * Get current user information
 */
export const getCurrentUser = async (): Promise<ApiResponse<{ user: { id: string; email: string } }>> => {
  const headers = await getAuthHeaders();
  return httpGet<{ user: { id: string; email: string } }>(getBackendUrl('/api/users/me'), headers);
};

/**
 * Login user (HTTP call only)
 */
export const loginUser = async (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
  return httpPost<LoginResponse>(getBackendUrl('/api/auth/login'), credentials);
};

/**
 * Register new user (HTTP call only)
 */
export const registerUser = async (userData: RegisterRequest): Promise<ApiResponse<RegisterResponse>> => {
  return httpPost<RegisterResponse>(getBackendUrl('/api/auth/register'), userData);
};

/**
 * Create a new post and send it to the specified platforms
 */
export const createPost = async (
  postData: CreatePostRequest,
): Promise<ApiResponse<CreatePostResponse>> => {
  const headers = await getAuthHeaders();
  return httpPost<CreatePostResponse>(getBackendUrl('/api/post'), postData, headers);
};

/**
 * Get platform connection status from backend
 */
export const getPlatformStatus = async (): Promise<ApiResponse<{
  platform: string;
  isConnected: boolean;
  username: string | null;
  expiresAt: string | null;
}[]>> => {
  const headers = await getAuthHeaders();
  return httpGet<{
    platform: string;
    isConnected: boolean;
    username: string | null;
    expiresAt: string | null;
  }[]>(getBackendUrl('/api/platforms/status'), headers);
};

/**
 * Disconnect a platform by deleting its tokens from backend
 */
export const disconnectPlatform = async (platform: string): Promise<ApiResponse<{
  success: boolean;
  message: string;
}>> => {
  const headers = await getAuthHeaders();
  return httpDelete<{
    success: boolean;
    message: string;
  }>(getBackendUrl(`/api/platforms/tokens/${platform}`), headers);
};

// ============================================================================
// PLATFORM CREDENTIALS FUNCTIONS
// ============================================================================

/**
 * Store platform credentials for a platform (OnlyFans, etc.)
 */
export const storePlatformCredentials = async (
  credentials: PlatformCredentialsCreate,
): Promise<ApiResponse<{
  success: boolean;
  message: string;
}>> => {
  console.log('storePlatformCredentials: Storing credentials for platform:', credentials.platform);
  const url = getBackendUrl('/api/platforms/credentials');
  const headers = await getAuthHeaders();
  console.log('storePlatformCredentials: Making request to:', url);
  console.log('storePlatformCredentials: Headers:', headers);
  console.log('storePlatformCredentials: Credentials data:', credentials);
  return httpPost<{
    success: boolean;
    message: string;
  }>(url, credentials, headers);
};

/**
 * Get stored platform credentials for a platform
 */
export const getPlatformCredentials = async (
  platform: string,
): Promise<ApiResponse<PlatformCredentialsResponse | null>> => {
  const headers = await getAuthHeaders();
  return httpGet<PlatformCredentialsResponse | null>(
    getBackendUrl(`/api/platforms/credentials/${platform}`),
    headers,
  );
};

/**
 * Delete platform credentials for a platform
 */
export const deletePlatformCredentials = async (platform: string): Promise<ApiResponse<{
  success: boolean;
  message: string;
}>> => {
  const headers = await getAuthHeaders();
  return httpDelete<{
    success: boolean;
    message: string;
  }>(getBackendUrl(`/api/platforms/credentials/${platform}`), headers);
};


