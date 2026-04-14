import React, { useMemo } from 'react';
import { ImageBackground, SafeAreaView, StyleSheet, View } from 'react-native';

const backgrounds = [
  require('../../assets/backgrounds/fast-water-stream.jpg'),
  require('../../assets/backgrounds/rock-water-stream.jpg'),
  require('../../assets/backgrounds/rivers-water-streams.jpg')
];

export const ScreenBackground = ({ children }: { children: React.ReactNode }) => {
  const background = useMemo(() => backgrounds[Math.floor(Math.random() * backgrounds.length)], []);

  return (
    <ImageBackground source={background} resizeMode="cover" style={styles.bg}>
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>{children}</SafeAreaView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#08161f' },
  topGlow: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(94, 196, 230, 0.2)'
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -140,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: 'rgba(38, 84, 124, 0.3)'
  },
  overlay: { flex: 1, backgroundColor: 'rgba(5, 18, 28, 0.64)' },
  container: { flex: 1 }
});
