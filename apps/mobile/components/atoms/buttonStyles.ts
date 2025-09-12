import type { ButtonProps, Colors, TextProps } from '@rneui/themed';
import type { ColorValue } from 'react-native';

type ComputeStylesInput = Readonly<{
  type: ButtonProps['type'];
  color: ButtonProps['color'];
  size: ButtonProps['size'];
  disabled?: boolean;
  themeColors: Colors;
  icon?: ButtonProps['icon'];
  iconPosition?: ButtonProps['iconPosition'];
  noWrap?: boolean;
}>;

type IconStyle = Readonly<{
  color: ColorValue;
  size: number;
}>;

type ComputeStylesOutput = Readonly<{
  titleStyle: ButtonProps['titleStyle'];
  titleProps: ButtonProps['titleProps'];
  buttonStyle: ButtonProps['buttonStyle'];
  iconStyle: IconStyle;
  iconContainerStyle: ButtonProps['iconContainerStyle'];
}>;

export function resolveBaseAndOnColors(
  themeColors: Colors,
  color: ButtonProps['color'] = 'primary',
): Readonly<{ base: ColorValue; on: ColorValue }> {
  const onKey = `on${capitalize(color as string)}`;
  const base =
    (themeColors[color as keyof Colors] as ColorValue) ?? (themeColors.primary as ColorValue);
  const on = (themeColors[onKey as keyof Colors] as ColorValue) ?? '#ffffff';
  return { base, on };
}

export function computeButtonStyles({
  type,
  color,
  size = 'md',
  disabled,
  themeColors,
  icon,
  iconPosition = 'left',
  noWrap,
}: ComputeStylesInput): ComputeStylesOutput {
  const { base, on } = resolveBaseAndOnColors(themeColors, color);

  const sizeMap: Record<
    NonNullable<ButtonProps['size']>,
    { fontSize: number; paddingH: number; paddingV: number }
  > = {
    sm: { fontSize: 14, paddingH: 12, paddingV: 6 },
    md: { fontSize: 16, paddingH: 16, paddingV: 10 },
    lg: { fontSize: 18, paddingH: 20, paddingV: 14 },
  } as const;

  const iconSizeMap: Record<NonNullable<ButtonProps['size']>, number> = {
    sm: 16,
    md: 18,
    lg: 20,
  };
  const iconSize = iconSizeMap[size] ?? 18;

  const { fontSize, paddingH, paddingV } = sizeMap[size] ?? sizeMap.md;

  const contentColor = type === 'solid' ? on : base;

  const backgroundColor = type === 'solid' ? base : 'transparent';
  const borderWidth = type === 'outline' ? 1 : 0;
  const borderColor = type === 'outline' ? base : 'transparent';

  const titleProps = noWrap ? ({ numberOfLines: 1, ellipsizeMode: 'tail' } as TextProps) : {};

  return {
    titleStyle: {
      color: contentColor,
      fontSize,
      fontWeight: '600',
      paddingVertical: paddingV,
      marginLeft: icon && iconPosition === 'left' ? -4 : paddingH,
      marginRight: icon && iconPosition === 'right' ? -4 : paddingH,
    },
    titleProps,
    buttonStyle: {
      paddingHorizontal: 0,
      paddingVertical: 0,
      opacity: disabled ? 0.5 : 1,
      backgroundColor,
      borderWidth,
      borderColor,
      borderRadius: 9999,
    },
    iconStyle: {
      color: contentColor,
      size: iconSize,
    },
    iconContainerStyle: {
      paddingLeft: 0,
      paddingRight: 0,
      paddingVertical: paddingV,
      minWidth: 30,
    },
  };
}

function capitalize<T extends string>(value: T): Capitalize<T> {
  return (value.charAt(0).toUpperCase() + value.slice(1)) as Capitalize<T>;
}
