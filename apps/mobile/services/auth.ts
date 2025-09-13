import * as SecureStore from 'expo-secure-store';
import { getCurrentUser, loginUser, registerUser } from './backend';
import { isApiError } from './http';

const JWT_TOKEN_KEY = 'jwt_token';

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

type AuthVerificationResult = {
  success: boolean;
  message: string;
  reason?: 'no_token' | 'unauthorized' | 'network_error' | 'success';
};

/**
 * Login user and store JWT token
 */
export const login = async (credentials: LoginRequest): Promise<{ success: boolean; data?: LoginResponse; error?: string }> => {
  try {
    const response = await loginUser(credentials);
    
    // Store JWT token if login successful
    if (response.data?.token) {
      await SecureStore.setItemAsync(JWT_TOKEN_KEY, response.data.token);
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: isApiError(error) ? error.message : 'Login failed' 
    };
  }
};

/**
 * Register new user
 */
export const register = async (userData: RegisterRequest): Promise<{ success: boolean; data?: RegisterResponse; error?: string }> => {
  try {
    const response = await registerUser(userData);
    
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: isApiError(error) ? error.message : 'Registration failed' 
    };
  }
};

/**
 * Get stored JWT token
 */
export const getStoredAuthToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(JWT_TOKEN_KEY);
};

/**
 * Clear stored JWT token (logout)
 */
export const logout = async (): Promise<void> => {
  // TODO: Maybe call clearAllPlatformTokens here too?
  await SecureStore.deleteItemAsync(JWT_TOKEN_KEY);
};

/**
 * Check if user has local auth token stored (offline check)
 */
export const hasLocalAuthToken = async (): Promise<boolean> => {
  return !!(await getStoredAuthToken());
};

/**
 * Verify authentication by checking local token and then checking server by calling /users/me
 * This method intentionally only clears local tokens on 401 response
 * to prevent accidental clearing of tokens when offline
 * 
 * @param allowOffline - Whether to return success if tokens exist but the device is offline (default: true)
 */
export const verifyAuthentication = async (allowOffline: boolean = true): Promise<AuthVerificationResult> => {
  console.log('Auth.verifyAuthentication: getting stored auth token...');
  let token = await getStoredAuthToken();
  console.log('Auth.verifyAuthentication: found token:', !!token);

  if(!token) {
    return {
      success: false,
      message: 'No authentication token found',
      reason: 'no_token'
    };
  }

  try {
    console.log('Auth.verifyAuthentication: checking if user is authenticated...');
    const response = await getCurrentUser();
    console.log('Auth.verifyAuthentication: response status:', response.status);
  } catch (error) {
    console.log('Auth.verifyAuthentication: error:', error);
    
    if (isApiError(error) && error.status === 401) {
      console.log('Auth.verifyAuthentication: unauthorized, clearing local tokens');
      await logout();
      return {
        success: false,
        message: 'Authentication token is invalid or expired',
        reason: 'unauthorized'
      };
    }
    
    return {
      success: allowOffline,
      message: allowOffline ? 'Network error occurred, but offline mode is allowed' : 'Network error occurred',
      reason: 'network_error'
    };
  }

  return {
    success: true,
    message: 'Authentication verified successfully',
    reason: 'success'
  };
};