import React, { useMemo } from 'react';
import { Image, ImageBackground, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/design/theme';

type WebBackgroundStyle = {
  backgroundImage?: string;
  backgroundPosition: string;
  backgroundRepeat: string;
  backgroundSize: string;
  opacity: number;
};

type WebForegroundStyle = {
  minHeight?: number | string;
  height?: number | string;
  overflow?: 'hidden' | 'visible';
};

export const ScreenBackground = ({ children }: { children: React.ReactNode }) => {
  const { width, height } = useWindowDimensions();
  const { theme } = useTheme();
  const background = useMemo(() => theme.background, [theme]);
  const isLandscape = width > height;
  const isWideWeb = Platform.OS === 'web' && width >= 900;
  const webBackgroundUri = useMemo(() => {
    if (Platform.OS !== 'web' || !background.image) return null;
    try {
      return Image.resolveAssetSource(background.image)?.uri ?? null;
    } catch {
      return null;
    }
  }, [background.image]);
  const webForegroundStyle = useMemo<WebForegroundStyle | null>(
    () =>
      Platform.OS === 'web'
        ? {
            minHeight: '100vh' as never,
            overflow: 'visible'
          }
        : null,
    []
  );
  const webRootStyle = useMemo(
    () =>
      Platform.OS === 'web'
        ? ({
            minHeight: '100vh',
            width: '100%',
            overflow: 'visible'
          } as never)
        : null,
    []
  );
  const webBackgroundImageStyle = useMemo<WebBackgroundStyle>(
    () => ({
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      opacity: background.imageOpacity,
      ...(webBackgroundUri ? { backgroundImage: `url("${webBackgroundUri}")` } : {})
    }),
    [background.imageOpacity, webBackgroundUri]
  );
  const sharedBackgroundLayers = (
    <>
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
    </>
  );

  return (
    <View style={[styles.root, webRootStyle]}>
      {Platform.OS === 'web' ? (
        <View
          style={[
            styles.webBg,
            {
              backgroundColor: theme.colors.bg
            }
          ]}
        >
          <View
            style={[
              styles.webBgImage,
              webBackgroundImageStyle as never
            ]}
          />
          {sharedBackgroundLayers}
        </View>
      ) : (
        <ImageBackground
          source={background.image}
          resizeMode="cover"
          style={styles.bg}
          imageStyle={{ opacity: background.imageOpacity }}
        >
          {sharedBackgroundLayers}
        </ImageBackground>
      )}
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, Platform.OS === 'web' ? styles.webContainer : null, webForegroundStyle as never]}>
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
  webBg: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'transparent'
  },
  webBgImage: {
    ...StyleSheet.absoluteFillObject
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
    borderTopWidth: 1,
    borderBottomWidth: 1
  },
  container: {
    flex: 1,
    width: '100%'
  },
  webContainer: {
    minHeight: 0,
    overflow: 'visible'
  }
});
