import React from 'react';
import { Keyboard, TouchableWithoutFeedback, View } from 'react-native';

export const KeyboardDismissView = ({ children }: { children: React.ReactNode }) => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>{children}</View>
    </TouchableWithoutFeedback>
  );
};
