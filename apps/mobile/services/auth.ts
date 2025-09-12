import * as SecureStore from 'expo-secure-store';
import { httpPost } from './http';
import Constants from 'expo-constants';

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

// Helper to construct full backend URLs
const getBackendUrl = (endpoint: string): string => {
  const baseUrl = getBackendBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

const JWT_TOKEN_KEY = 'jwt_token';

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
  };
};

export type RegisterRequest = {
  email: string;
  password: string;
};

export type RegisterResponse = {
  token: string;
  user: {
    id: string;
    email: string;
  };
};

/**
 * Login user and store JWT token
 */
export const login = async (credentials: LoginRequest): Promise<{ success: boolean; data?: LoginResponse; error?: string }> => {
  try {
    const url = getBackendUrl('/api/auth/login');
    const response = await httpPost<LoginResponse>(url, credentials);
    
    // Store JWT token if login successful
    if (response.data?.token) {
      await SecureStore.setItemAsync(JWT_TOKEN_KEY, response.data.token);
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      error: error && typeof error === 'object' && 'message' in error 
        ? (error as { message: string }).message 
        : 'Login failed' 
    };
  }
};

/**
 * Register new user
 */
export const register = async (userData: RegisterRequest): Promise<{ success: boolean; data?: RegisterResponse; error?: string }> => {
  try {
    const url = getBackendUrl('/api/auth/register');
    const response = await httpPost<RegisterResponse>(url, userData);
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Register error:', error);
    return { 
      success: false, 
      error: error && typeof error === 'object' && 'message' in error 
        ? (error as { message: string }).message 
        : 'Registration failed' 
    };
  }
};

/**
 * Get stored JWT token
 */
export const getStoredAuthToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(JWT_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to retrieve auth token:', error);
    return null;
  }
};

/**
 * Clear stored JWT token (logout)
 */
export const logout = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(JWT_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear auth token:', error);
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getStoredAuthToken();
  return token !== null;
};
