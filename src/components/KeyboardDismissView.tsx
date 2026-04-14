import React from 'react';
import { Keyboard, Pressable, View } from 'react-native';

export const KeyboardDismissView = ({ children }: { children: React.ReactNode }) => {
  return (
    <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
};
