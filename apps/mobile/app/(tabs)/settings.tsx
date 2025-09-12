import { healthCheck, storeAuthTokens } from '@/services/backend';
import { getErrorMessage } from '@/utils/errorUtils';
import { Button, ButtonGroup, Text, useThemeMode } from '@rneui/themed';
import React, { useState } from 'react';
import { Alert, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsTab() {
  const { mode, setMode } = useThemeMode();
  const insets = useSafeAreaInsets();
  const [pref, setPref] = React.useState<'automatic' | 'light' | 'dark'>(() => 'automatic');
  const [isTestingBackend, setIsTestingBackend] = useState(false);
  const [isTestingHealth, setIsTestingHealth] = useState(false);
  const systemScheme = useColorScheme() ?? 'light';

  React.useEffect(() => {
    const targetMode = pref === 'automatic' ? systemScheme : pref;
    if (targetMode !== mode) {
      setMode(targetMode);
    }
  }, [pref, systemScheme, mode, setMode]);

  const testBackendTokenStorage = async () => {
    try {
      setIsTestingBackend(true);

      await storeAuthTokens({
        platform: 'twitter',
        accessToken: 'test_access_token_123',
        refreshToken: 'test_refresh_token_456',
        expiresIn: 3600,
        username: 'testuser',
        userId: 'test_user_123',
      });

      Alert.alert('Success', 'Test token stored successfully in backend!');
    } catch (error) {
      Alert.alert('Error', `Failed to store test token: ${getErrorMessage(error)}`);
    } finally {
      setIsTestingBackend(false);
    }
  };

  const testHealthCheck = async () => {
    try {
      setIsTestingHealth(true);

      const response = await healthCheck();

      Alert.alert(
        'Success',
        `Backend is healthy!\nStatus: ${response.data.status}\nTimestamp: ${response.data.timestamp}`,
      );
    } catch (error) {
      Alert.alert('Error', `Health check failed: ${getErrorMessage(error)}`);
    } finally {
      setIsTestingHealth(false);
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ padding: 16, gap: 16 }}>
        <Text h3>Settings</Text>
        <Text style={{ fontWeight: '600' }}>Theme</Text>
        <ButtonGroup
          buttons={['Automatic', 'Light', 'Dark']}
          selectedIndex={pref === 'automatic' ? 0 : pref === 'light' ? 1 : 2}
          onPress={(index) => setPref(index === 0 ? 'automatic' : index === 1 ? 'light' : 'dark')}
        />
        <Text>Current: {pref === 'automatic' ? `System (${systemScheme})` : pref}</Text>

        <Text style={{ fontWeight: '600', marginTop: 24 }}>Backend Testing</Text>
        <Button
          title={isTestingHealth ? 'Checking...' : 'Health Check'}
          onPress={testHealthCheck}
          disabled={isTestingHealth}
          type="outline"
        />
        <Button
          title={isTestingBackend ? 'Testing...' : 'Test Backend Token Storage'}
          onPress={testBackendTokenStorage}
          disabled={isTestingBackend}
          type="outline"
        />
      </View>
    </View>
  );
}
