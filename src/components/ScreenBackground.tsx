import React from 'react';
import { ImageBackground, SafeAreaView, StyleSheet, View } from 'react-native';

const bgUri = 'https://images.unsplash.com/photo-1475257026007-0753dbf4239f?auto=format&fit=crop&w=1600&q=80';

export const ScreenBackground = ({ children }: { children: React.ReactNode }) => (
  <ImageBackground source={{ uri: bgUri }} resizeMode="cover" style={styles.bg}>
    <View style={styles.overlay}>
      <SafeAreaView style={styles.container}>{children}</SafeAreaView>
    </View>
  </ImageBackground>
);

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(7, 28, 35, 0.72)' },
  container: { flex: 1 }
});
