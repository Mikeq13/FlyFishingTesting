import React from 'react';
import { Keyboard, Platform, TouchableWithoutFeedback, View } from 'react-native';

export const KeyboardDismissView = ({ children }: { children: React.ReactNode }) => {
  if (Platform.OS === 'web') {
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1 }}>{children}</View>
    </TouchableWithoutFeedback>
  );
};
