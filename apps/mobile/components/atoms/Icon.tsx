import { Icon as RNEIcon, type IconProps as RNEIconProps } from '@rneui/themed';

export type IconProps = RNEIconProps;

export default function Icon({ name, type = 'feather', size = 24, color }: RNEIconProps) {
  return <RNEIcon name={name as any} type={type as any} size={size} color={color as any} />;
}
