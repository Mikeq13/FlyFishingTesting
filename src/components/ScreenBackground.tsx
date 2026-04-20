import React, { useMemo } from 'react';
import { ImageBackground, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/design/theme';

export const ScreenBackground = ({ children }: { children: React.ReactNode }) => {
  const { width, height } = useWindowDimensions();
  const { theme } = useTheme();
  const background = useMemo(() => theme.background, [theme]);
  const isLandscape = width > height;
  const isWideWeb = Platform.OS === 'web' && width >= 900;
  const minHeight = Platform.OS === 'web' ? height : undefined;

  return (
    <View style={[styles.root, minHeight ? { minHeight } : null]}>
      <ImageBackground
        source={background.image}
        resizeMode="cover"
        style={styles.bg}
        imageStyle={[styles.image, { opacity: background.imageOpacity }]}
      >
        <View
          style={[
            styles.topGlow,
            { backgroundColor: background.topGlow },
            isLandscape && styles.topGlowLandscape,
            isWideWeb && styles.topGlowDesktop
          ]}
        />
        <View
          style={[
            styles.bottomGlow,
            { backgroundColor: background.bottomGlow },
            isLandscape && styles.bottomGlowLandscape,
            isWideWeb && styles.bottomGlowDesktop
          ]}
        />
        <View style={[styles.overlay, { backgroundColor: background.overlay }]} />
        <View
          style={[
            styles.texture,
            {
              backgroundColor: background.texture,
              borderTopColor: background.textureBorderTop,
              borderBottomColor: background.textureBorderBottom
            }
          ]}
        />
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
    backgroundColor: 'transparent'
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent'
  },
  image: {},
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
    borderTopWidth: 1,
    borderBottomWidth: 1
  },
  container: {
    flex: 1
  }
});
