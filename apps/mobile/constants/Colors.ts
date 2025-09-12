/**
 * App color palette based on React Native Elements defaults, with app-specific aliases.
 * We spread RNE's default palettes so you can see and override values in this file.
 */
import { darkColors, lightColors } from '@rneui/themed';

// node_modules/@rneui/base-edge/dist/helpers/colors.js

// Extend RNE Colors typing with our custom tokens
declare module '@rneui/themed' {
  interface Colors {
    surface: string;
    onSurface: string;
    onBackground: string;
    onPrimary: string;
    onSecondary: string;
    onSuccess: string;
    onWarning: string;
    onError: string;
    outline: string;
  }
}

export const Colors = {
  light: {
    ...lightColors,

    background: '#ECEDEE',
    onBackground: '#11181C',

    surface: '#ECEDEE',
    onSurface: '#11181C',

    primary: '#007AFF',
    onPrimary: '#ECEDEE',

    secondary: '#687076',
    onSecondary: '#FFFFFF',

    success: '#34C759',
    onSuccess: '#ECEDEE',

    warning: '#FF9500',
    onWarning: '#ECEDEE',

    error: '#FF3B30',
    onError: '#ECEDEE',

    outline: '#BCBCBC',

    // RNEs default disabled was too light
    disabled: '#C7C7CC',
  },
  dark: {
    ...darkColors,

    background: '#11181C',
    onBackground: '#ECEDEE',

    surface: '#11181C',
    onSurface: '#ECEDEE',

    primary: '#007AFF',
    onPrimary: '#11181C',

    secondary: '#687076',
    onSecondary: '#9BA1A6',

    success: '#34C759',
    onSuccess: '#11181C',

    warning: '#FF9500',
    onWarning: '#11181C',

    error: '#FF3B30',
    onError: '#11181C',

    outline: '#545E67',

    disabled: '#3A3A3C',
  },
};
