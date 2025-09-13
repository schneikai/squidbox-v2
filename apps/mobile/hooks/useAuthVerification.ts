import { useCallback } from 'react';
import { Alert } from 'react-native';
import { verifyAuthentication } from '@/services/auth';

/**
 * Hook for verifying authentication with the server
 * Use this when you need to ensure the user is actually authenticated
 * before performing sensitive operations (like OAuth flows)
 * 
 * Shows an alert if authentication fails and returns false
 */
export const useAuthVerification = () => {
  const ensureAuth = useCallback(async (): Promise<boolean> => {
    console.log('useAuthVerification.ensureAuth: verifying authentication...');
    const result = await verifyAuthentication(false);
    console.log('useAuthVerification.ensureAuth: authentication result:', result);
    
    if (!result.success) {
      Alert.alert(
        'Authentication Required', 
        result.message
      );
    }
    
    return result.success;
  }, []);

  return { ensureAuth };
};
