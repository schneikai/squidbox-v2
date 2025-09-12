import { Button, Input, Text, useTheme } from '@rneui/themed';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { theme } = useTheme();
  const { login: contextLogin, register: contextRegister } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Prefill with dev credentials in development
  useEffect(() => {
    if (__DEV__) {
      const devEmail = process.env.EXPO_PUBLIC_DEV_USER_EMAIL;
      const devPassword = process.env.EXPO_PUBLIC_DEV_USER_PASSWORD;
      
      if (devEmail && devPassword) {
        setEmail(devEmail);
        setPassword(devPassword);
      }
    }
  }, []);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const success = await contextLogin(email, password);
        if (success) {
          router.replace('/(tabs)/compose');
        } else {
          Alert.alert('Error', 'Login failed. Please try again.');
        }
      } else {
        const response = await contextRegister(email, password);
        if (response.success) {
          Alert.alert('Success', 'Account created successfully! Please log in.', [
            { text: 'OK', onPress: () => setIsLogin(true) },
          ]);
        } else {
          Alert.alert('Error', response.error || 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text h2 style={[styles.title, { color: theme.colors.black }]}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </Text>

          <Text style={[styles.subtitle, { color: theme.colors.grey2 }]}>
            {isLogin
              ? 'Sign in to your Squidbox account'
              : 'Join Squidbox to start posting across platforms'}
          </Text>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={styles.inputContainer}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              containerStyle={styles.inputContainer}
            />

            {!isLogin && (
              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                containerStyle={styles.inputContainer}
              />
            )}

            <Button
              title={isLogin ? 'Sign In' : 'Create Account'}
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading}
              buttonStyle={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
              titleStyle={styles.submitButtonTitle}
            />

            <Button
              title={isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              onPress={() => {
                setIsLogin(!isLogin);
                setPassword('');
                setConfirmPassword('');
              }}
              type="clear"
              titleStyle={[styles.switchButtonTitle, { color: theme.colors.primary }]}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  submitButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  switchButtonTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  devBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  devBannerText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  devBannerSubtext: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.8,
  },
});
