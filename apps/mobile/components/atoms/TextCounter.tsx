import { Text } from '@rneui/themed';
import React from 'react';

type TextCounterProps = Readonly<{
  count: number;
  limit: number;
}>;

export default function TextCounter({ count, limit }: TextCounterProps) {
  const remaining = limit - count;
  const nearLimit = remaining <= 20;
  return (
    <Text style={{ color: nearLimit ? (remaining < 0 ? '#ef4444' : '#f59e0b') : '#9ca3af' }}>
      {remaining}
    </Text>
  );
}
