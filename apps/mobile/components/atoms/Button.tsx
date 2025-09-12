import type { Spreadable } from '@/types';
import { Button as RNEButton, useTheme, type ButtonProps as RNEButtonProps } from '@rneui/themed';
import React from 'react';
import { computeButtonStyles } from './buttonStyles';

export type ButtonProps = Readonly<RNEButtonProps> &
  Readonly<{
    noWrap?: boolean;
  }>;

export default function Button({
  title,
  onPress,
  loading,
  disabled,
  accessibilityLabel,
  type = 'solid',
  color = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  noWrap = false,
}: ButtonProps) {
  const { theme } = useTheme();
  const { titleStyle, buttonStyle, iconStyle, iconContainerStyle } = computeButtonStyles({
    type,
    color,
    size,
    disabled,
    icon,
    iconPosition,
    themeColors: theme.colors,
  });
  const styledIcon = icon
    ? {
        ...(icon as Spreadable),
        ...iconStyle,
      }
    : undefined;

  return (
    <RNEButton
      title={title}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      type={type}
      color={color}
      size={size}
      icon={styledIcon}
      iconContainerStyle={iconContainerStyle}
      iconPosition={iconPosition}
      radius={9999}
      titleStyle={titleStyle}
      titleProps={noWrap ? { numberOfLines: 1, ellipsizeMode: 'tail' } : undefined}
      buttonStyle={buttonStyle}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    />
  );
}
