import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';

export const ScreenBackground = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.bg}>
    <View style={styles.topGlow} />
    <View style={styles.bottomGlow} />
    <View style={styles.overlay}>
      <SafeAreaView style={styles.container}>{children}</SafeAreaView>
    </View>
  </View>
);

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0a1b24' },
  topGlow: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(42, 157, 143, 0.18)'
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -140,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: 'rgba(38, 84, 124, 0.24)'
  },
  overlay: { flex: 1, backgroundColor: 'rgba(7, 28, 35, 0.72)' },
  container: { flex: 1 }
});
