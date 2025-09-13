import { login as authLogin, register as authRegister, logout, hasLocalAuthToken, verifyAuthentication } from '@/services/auth';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatusAsync = useCallback(async () => {
    try {
      console.log('AuthProvider.checkAuthStatusAsync: verifying authentication...');
      const result = await verifyAuthentication();
      console.log('AuthProvider.checkAuthStatusAsync: authentication result:', result);
      setIsAuthenticated(result.success);

    } catch (error) {
      console.error('AuthProvider.checkAuthStatusAsync: error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatusAsync();
  }, [checkAuthStatusAsync]);

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authLogin({ email, password });
      if (response.success) {
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const handleRegister = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authRegister({ email, password });
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Registration failed' };
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
