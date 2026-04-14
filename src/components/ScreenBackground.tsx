import React, { useMemo } from 'react';
import { ImageBackground, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const backgrounds = [
  require('../../assets/backgrounds/fast-water-stream.jpg'),
  require('../../assets/backgrounds/rock-water-stream.jpg'),
  require('../../assets/backgrounds/rivers-water-streams.jpg')
];

export const ScreenBackground = ({ children }: { children: React.ReactNode }) => {
  const { width, height } = useWindowDimensions();
  const background = useMemo(() => backgrounds[Math.floor(Math.random() * backgrounds.length)], []);
  const isLandscape = width > height;
  const isWideWeb = Platform.OS === 'web' && width >= 900;
  const layoutKey = `${Math.round(width)}x${Math.round(height)}`;

  return (
    <ImageBackground
      key={layoutKey}
      source={background}
      resizeMode="cover"
      style={[styles.bg, { width, minHeight: height }]}
      imageStyle={styles.image}
    >
      <View
        style={[
          styles.topGlow,
          isLandscape && styles.topGlowLandscape,
          isWideWeb && styles.topGlowDesktop
        ]}
      />
      <View
        style={[
          styles.bottomGlow,
          isLandscape && styles.bottomGlowLandscape,
          isWideWeb && styles.bottomGlowDesktop
        ]}
      />
      <View style={[styles.overlay, { minHeight: height }]}>
        <SafeAreaView style={[styles.container, { minHeight: height }]}>{children}</SafeAreaView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#08161f' },
  image: {
    opacity: 0.95
  },
  topGlow: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(94, 196, 230, 0.2)'
  },
  topGlowLandscape: {
    top: -80,
    right: -40,
    width: 220,
    height: 220
  },
  topGlowDesktop: {
    top: -60,
    right: 40,
    width: 280,
    height: 280
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
  bottomGlowLandscape: {
    bottom: -90,
    left: -30,
    width: 240,
    height: 240
  },
  bottomGlowDesktop: {
    bottom: -80,
    left: 60,
    width: 300,
    height: 300
  },
  overlay: { flex: 1, backgroundColor: 'rgba(5, 18, 28, 0.64)' },
  container: { flex: 1 }
});
