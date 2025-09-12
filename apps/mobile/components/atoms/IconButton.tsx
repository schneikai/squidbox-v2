import Button, { type ButtonProps } from '@/components/atoms/Button';
import React from 'react';

type IconButtonProps = Readonly<{
  iconName: string;
  iconType?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  type?: ButtonProps['type'];
  color?: ButtonProps['color'];
  size?: ButtonProps['size'];
}>;

export default function IconButton({
  iconName,
  iconType = 'feather',
  onPress,
  accessibilityLabel,
  disabled,
  type = 'clear',
  color = 'primary',
  size = 'md',
}: IconButtonProps) {
  return (
    <Button
      type={type}
      color={color}
      size={size}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      icon={{ name: iconName, type: iconType }}
    />
  );
}
