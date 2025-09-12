import type { Platform } from '@/contexts/PlatformContext';
import type { OAuthTokensCreate } from '@squidbox/contracts';
import type { PlatformPosts } from '@/types/post';
import Constants from 'expo-constants';
import { httpGet, httpPost, type ApiResponse } from './http';

export type CreatePostRequest = Readonly<{
  platformPosts: readonly PlatformPosts[];
}>;

export type CreatePostResponse = Readonly<{
  id: string;
  status: 'success' | 'partial' | 'failed';
  platformResults: readonly {
    platform: Platform;
    success: boolean;
    postId?: string;
    error?: string;
  }[];
  createdAt: string;
}>;

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

// Get JWT secret for this backend
const getJwtSecret = (): string => {
  // Backend requires to login and respond with a JWT token!
  // curl -X POST http://localhost:8080/api/auth/login \
  // -H "Content-Type: application/json" \
  // -d '{"email": "test2@example.com", "password": "password123"}'
  // TODO: We need to implemet login in the app!
  // JWT_SECRET should be removed from the frontend! Only the backend needs it to create and verify tokens!

  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWZnbXZ1ZzgwMDAwdGVqbHhlbm04NzFzIiwiaWF0IjoxNzU3NjY5MjQxLCJleHAiOjE3NTgyNzQwNDF9.EL_tJM6l4UMvNZ71v5dVo54G0c3Im-Igd9c7uLHP6Cw';
};

// Get authentication headers for backend requests
const getAuthHeaders = (): Record<string, string> => {
  const jwtSecret = getJwtSecret();
  return jwtSecret ? { Authorization: `Bearer ${jwtSecret}` } : {};
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
  return httpPost<AuthTokensResponse>(url, tokens, getAuthHeaders());
};

/**
 * Get stored OAuth tokens for a platform
 */
export const getAuthTokens = async (
  platform: Platform,
): Promise<ApiResponse<AuthTokensRequest | null>> => {
  return httpGet<AuthTokensRequest | null>(
    getBackendUrl(`/api/users/tokens/${platform}`),
    getAuthHeaders(),
  );
};

/**
 * Health check endpoint
 */
export const healthCheck = async (): Promise<
  ApiResponse<{ status: string; timestamp: string }>
> => {
  return httpGet<{ status: string; timestamp: string }>(getBackendUrl('/health'), getAuthHeaders());
};

/**
 * Create a new post and send it to the specified platforms
 */
export const createPost = async (
  postData: CreatePostRequest,
): Promise<ApiResponse<CreatePostResponse>> => {
  return httpPost<CreatePostResponse>(getBackendUrl('/api/post'), postData, getAuthHeaders());
};
