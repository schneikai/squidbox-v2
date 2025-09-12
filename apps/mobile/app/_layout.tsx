// app/_layout.tsx
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  ThemeProvider as NavThemeProvider,
} from '@react-navigation/native';
import { ThemeProvider, createTheme, useTheme, useThemeMode } from '@rneui/themed';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import { PlatformProvider } from '@/contexts/PlatformContext';

const rneTheme = createTheme({
  lightColors: { ...Colors.light },
  darkColors: { ...Colors.dark },
  components: {
    Button: {},
    ButtonGroup: (props, theme) => ({
      containerStyle: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        borderColor: theme.colors.outline,
      },
      textStyle: { color: theme.colors.onSurface, fontWeight: '600' },
      selectedButtonStyle: { backgroundColor: theme.colors.primary },
      selectedTextStyle: { color: theme.colors.onPrimary },
      innerBorderStyle: { color: theme.colors.outline },
    }),
  },
});

function ThemedNavigation() {
  const { mode } = useThemeMode();
  const { theme } = useTheme();

  const navTheme = React.useMemo(() => {
    const base = mode === 'dark' ? NavDarkTheme : NavDefaultTheme;
    const colors = theme.colors;
    return {
      ...base,
      dark: mode === 'dark',
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.onBackground,
        border: colors.outline,
        notification: colors.warning,
      },
    };
  }, [mode, theme.colors]);

  return (
    <NavThemeProvider value={navTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  if (!loaded) return null;

  return (
    <ThemeProvider theme={rneTheme}>
      <PlatformProvider>
        <ThemedNavigation />
      </PlatformProvider>
    </ThemeProvider>
  );
}
