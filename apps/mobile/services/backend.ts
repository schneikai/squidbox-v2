import type { Platform } from '@squidbox/contracts';
import type { 
  OAuthTokensCreate, 
  CreatePostRequest, 
  CreatePostResponse
} from '@squidbox/contracts';
export type { CreatePostRequest, CreatePostResponse } from '@squidbox/contracts';
import Constants from 'expo-constants';
import { httpGet, httpPost, type ApiResponse } from './http';
import { getStoredAuthToken } from './auth';

export type AuthTokensRequest = OAuthTokensCreate;

export type AuthTokensResponse = Readonly<{
  success: boolean;
  message?: string;
}>;

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
  const token = await getStoredAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper to construct full backend URLs
const getBackendUrl = (endpoint: string): string => {
  const baseUrl = getBackendBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

/**
 * Store OAuth tokens for a platform
 */
export const storeAuthTokens = async (
  tokens: AuthTokensRequest,
): Promise<ApiResponse<AuthTokensResponse>> => {
  const url = getBackendUrl('/api/users/tokens');
  const headers = await getAuthHeaders();
  return httpPost<AuthTokensResponse>(url, tokens, headers);
};

/**
 * Get stored OAuth tokens for a platform
 */
export const getAuthTokens = async (
  platform: Platform,
): Promise<ApiResponse<AuthTokensRequest | null>> => {
  const headers = await getAuthHeaders();
  return httpGet<AuthTokensRequest | null>(
    getBackendUrl(`/api/users/tokens/${platform}`),
    headers,
  );
};

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
 * Create a new post and send it to the specified platforms
 */
export const createPost = async (
  postData: CreatePostRequest,
): Promise<ApiResponse<CreatePostResponse>> => {
  const headers = await getAuthHeaders();
  return httpPost<CreatePostResponse>(getBackendUrl('/api/post'), postData, headers);
};
