import { computeButtonStyles } from '@/components/atoms/buttonStyles';
import type { IconProps } from '@/components/atoms/Icon';
import type { Spreadable } from '@/types';
import { Button as RNEButton, useTheme, type ButtonProps as RNEButtonProps } from '@rneui/themed';
import React from 'react';
import { TextStyle, View } from 'react-native';

type SplitButtonContainerProps = Readonly<{
  type?: RNEButtonProps['type'];
  color?: RNEButtonProps['color'];
  size?: RNEButtonProps['size'];
  children: React.ReactNode;
}>;

export default function SplitButton({
  type = 'outline',
  color = 'primary',
  size = 'md',
  children,
}: SplitButtonContainerProps) {
  const { theme } = useTheme();

  const { titleStyle, buttonStyle } = computeButtonStyles({
    type,
    color,
    size,
    disabled: false,
    themeColors: theme.colors,
  });

  const injected = React.Children.toArray(children)
    .filter(Boolean)
    .map((child) =>
      React.isValidElement(child)
        ? React.cloneElement(child as any, { size, titleStyle, type })
        : child,
    );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', ...(buttonStyle as Spreadable) }}>
      <SplitButtonChildrenWithDividers titleStyle={titleStyle}>
        {injected as any}
      </SplitButtonChildrenWithDividers>
    </View>
  );
}

export function SplitButtonAction({
  title,
  onPress,
  accessibilityLabel,
  icon,
  noWrap,
  size = 'md',
  type = 'clear',
  color,
}: Readonly<{
  title?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  icon?: IconProps;
  noWrap?: boolean;
  size?: RNEButtonProps['size'];
  type?: RNEButtonProps['type'];
  color?: RNEButtonProps['color'];
}>) {
  const { theme } = useTheme();
  const { titleStyle, iconStyle, iconContainerStyle } = computeButtonStyles({
    type: type,
    color: color ?? 'primary',
    size: size,
    disabled: false,
    themeColors: theme.colors,
  });
  const styledIcon = icon
    ? {
        ...icon,
        ...iconStyle,
      }
    : undefined;

  return (
    <RNEButton
      type="clear"
      size={size}
      onPress={onPress}
      title={title}
      titleStyle={titleStyle}
      titleProps={noWrap ? ({ numberOfLines: 1, ellipsizeMode: 'tail' } as any) : undefined}
      icon={styledIcon}
      iconContainerStyle={iconContainerStyle}
      buttonStyle={{
        paddingHorizontal: 0,
        paddingVertical: 0,
      }}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

function SplitButtonChildrenWithDividers({
  children,
  titleStyle,
}: {
  children: React.ReactNode;
  titleStyle: RNEButtonProps['titleStyle'];
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <>
      {items.map((child, idx) => (
        <React.Fragment key={idx}>
          {child}
          {idx < items.length - 1 ? (
            <View
              style={{
                width: 1,
                alignSelf: 'stretch',
                marginVertical: 8,
                marginRight: -6,
                backgroundColor: (titleStyle as TextStyle)?.color,
              }}
            />
          ) : null}
        </React.Fragment>
      ))}
    </>
  );
}
