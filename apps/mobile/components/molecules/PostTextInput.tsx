import { Input } from '@rneui/themed';
import React from 'react';
import { View } from 'react-native';

type PostTextInputProps = Readonly<{
  value: string;
  onChangeText: (text: string) => void;
}>;

export default function PostTextInput({ value, onChangeText }: PostTextInputProps) {
  return (
    <View style={{ gap: 8 }}>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder="What is happening?!"
        multiline
        inputStyle={{ fontSize: 18 }}
        inputContainerStyle={{ borderBottomWidth: 0 }}
        containerStyle={{ paddingHorizontal: 0 }}
      />
    </View>
  );
}
