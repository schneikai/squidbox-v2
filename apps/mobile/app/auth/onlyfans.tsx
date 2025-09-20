import { useTheme } from '@rneui/themed';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { Input, Text } from '@rneui/themed';
import { storePlatformCredentials } from '@/services/backend';
import type { PlatformCredentialsCreate } from '@squidbox/contracts';

interface OnlyFansCredentials {
  username: string;
  password: string;
  totpSecret?: string;
}

export default function OnlyFansAuthPage() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [credentials, setCredentials] = useState<OnlyFansCredentials>({
    username: '',
    password: '',
    totpSecret: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Prefill with dev credentials in development
  useEffect(() => {
    if (__DEV__) {
      const devUsername = process.env.EXPO_PUBLIC_DEV_ONLYFANS_USERNAME;
      const devPassword = process.env.EXPO_PUBLIC_DEV_ONLYFANS_PASSWORD;
      const devTotpSecret = process.env.EXPO_PUBLIC_DEV_ONLYFANS_TOTP_SECRET;
      
      if (devUsername && devPassword) {
        setCredentials({
          username: devUsername,
          password: devPassword,
          totpSecret: devTotpSecret || '',
        });
      }
    }
  }, []);

  const handleInputChange = (field: keyof OnlyFansCredentials) => (text: string) => {
    setCredentials(prev => ({ ...prev, [field]: text }));
  };

  const handleSubmit = async () => {
    if (!credentials.username || !credentials.password) {
      Alert.alert('Missing Information', 'Please enter both username/email and password.');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('OnlyFans credentials:', {
        username: credentials.username,
        password: credentials.password,
        hasTotp: !!credentials.totpSecret,
      });
      
      // Store credentials in backend
      const credentialsData: PlatformCredentialsCreate = {
        platform: 'onlyfans',
        username: credentials.username,
        password: credentials.password,
        totpSecret: credentials.totpSecret || undefined,
      };
      
      const response = await storePlatformCredentials(credentialsData);
      
      if (response.data.success) {
        Alert.alert(
          'Success', 
          'OnlyFans account connected successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        throw new Error('Failed to store credentials');
      }
    } catch (error) {
      console.error('OnlyFans authentication error:', error);
      Alert.alert('Error', 'Failed to connect OnlyFans account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background }
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Button
            title=""
            icon={{ name: 'arrow-left', type: 'feather', size: 24 }}
            type="clear"
            onPress={() => router.back()}
            buttonStyle={styles.backButton}
          />
          <Text h3 style={[styles.title, { color: theme.colors.black }]}>
            Connect OnlyFans
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Description */}
        <Text style={[styles.description, { color: theme.colors.grey2 }]}>
          Enter your OnlyFans credentials to connect your account. Your credentials are securely stored and used only for posting content.
        </Text>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Username or Email"
            placeholder="Enter your OnlyFans username or email"
            value={credentials.username}
            onChangeText={handleInputChange('username')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            leftIcon={{
              name: 'user',
              type: 'feather',
              size: 20,
              color: theme.colors.grey3,
            }}
            inputContainerStyle={styles.inputContainer}
            labelStyle={styles.label}
          />

          <Input
            label="Password"
            placeholder="Enter your OnlyFans password"
            value={credentials.password}
            onChangeText={handleInputChange('password')}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={{
              name: 'lock',
              type: 'feather',
              size: 20,
              color: theme.colors.grey3,
            }}
            inputContainerStyle={styles.inputContainer}
            labelStyle={styles.label}
          />

          <Input
            label="TOTP Secret (Optional)"
            placeholder="Enter your TOTP secret if required"
            value={credentials.totpSecret}
            onChangeText={handleInputChange('totpSecret')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            leftIcon={{
              name: 'shield',
              type: 'feather',
              size: 20,
              color: theme.colors.grey3,
            }}
            inputContainerStyle={styles.inputContainer}
            labelStyle={styles.label}
            rightIcon={
              <Icon
                name="info"
                type="feather"
                size={16}
                color={theme.colors.grey3}
                onPress={() => Alert.alert(
                  'TOTP Secret',
                  'If OnlyFans requires two-factor authentication, enter the TOTP secret from your authenticator app setup.'
                )}
              />
            }
          />
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Icon
            name="shield-check"
            type="feather"
            size={20}
            color={theme.colors.success}
          />
          <Text style={[styles.securityText, { color: theme.colors.grey2 }]}>
            Your credentials are encrypted and stored securely. We never share your login information.
          </Text>
        </View>

        {/* Submit Button */}
        <Button
          title="Connect OnlyFans"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={!credentials.username || !credentials.password || isLoading}
          buttonStyle={styles.submitButton}
          titleStyle={styles.submitButtonText}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  description: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 0,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  securityText: {
    flex: 1,
    marginLeft: 12,
    lineHeight: 20,
  },
  submitButton: {
    paddingVertical: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
