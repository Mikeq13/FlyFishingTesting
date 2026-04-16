import React, { useMemo } from 'react';
import { ImageBackground, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const themes = [
  {
    name: 'Freestone Blue',
    image: require('../../assets/backgrounds/fast-water-stream.jpg'),
    overlay: 'rgba(5, 18, 28, 0.60)',
    topGlow: 'rgba(94, 196, 230, 0.22)',
    bottomGlow: 'rgba(38, 84, 124, 0.28)'
  },
  {
    name: 'Alpine Glass',
    image: require('../../assets/backgrounds/rock-water-stream.jpg'),
    overlay: 'rgba(7, 20, 30, 0.62)',
    topGlow: 'rgba(126, 214, 223, 0.18)',
    bottomGlow: 'rgba(31, 96, 127, 0.24)'
  },
  {
    name: 'Evening Run',
    image: require('../../assets/backgrounds/rivers-water-streams.jpg'),
    overlay: 'rgba(8, 17, 27, 0.66)',
    topGlow: 'rgba(72, 149, 239, 0.18)',
    bottomGlow: 'rgba(29, 53, 87, 0.30)'
  }
] as const;

export const ScreenBackground = ({ children }: { children: React.ReactNode }) => {
  const { width, height } = useWindowDimensions();
  const theme = useMemo(() => themes[Math.floor(Math.random() * themes.length)], []);
  const isLandscape = width > height;
  const isWideWeb = Platform.OS === 'web' && width >= 900;
  const minHeight = Platform.OS === 'web' ? height : undefined;

  return (
    <View style={[styles.root, minHeight ? { minHeight } : null]}>
      <ImageBackground
        source={theme.image}
        resizeMode="cover"
        style={styles.bg}
        imageStyle={styles.image}
      >
        <View
          style={[
            styles.topGlow,
            { backgroundColor: theme.topGlow },
            isLandscape && styles.topGlowLandscape,
            isWideWeb && styles.topGlowDesktop
          ]}
        />
        <View
          style={[
            styles.bottomGlow,
            { backgroundColor: theme.bottomGlow },
            isLandscape && styles.bottomGlowLandscape,
            isWideWeb && styles.bottomGlowDesktop
          ]}
        />
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]} />
        <View style={styles.texture} />
      </ImageBackground>
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, minHeight ? { minHeight } : null]}>
        {children}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#08161f'
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#08161f'
  },
  image: {
    opacity: 0.95
  },
  topGlow: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 999
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
    borderRadius: 999
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
  overlay: {
    ...StyleSheet.absoluteFillObject
  },
  texture: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.02)'
  },
  container: {
    flex: 1
  }
});
