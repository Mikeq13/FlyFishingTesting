import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAppSetting, setAppSetting } from '@/db/settingsRepo';

export type ThemeId = 'default_professional' | 'high_contrast' | 'daylight_light';
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'neutral' | 'danger' | 'ghost';
export type SurfaceTone = 'dark' | 'light' | 'modal';

type ThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  surfaceMuted: string;
  surfaceLight: string;
  surfaceLightAlt: string;
  border: string;
  borderStrong: string;
  borderLight: string;
  text: string;
  textMuted: string;
  textSoft: string;
  textDark: string;
  textDarkSoft: string;
  primary: string;
  secondary: string;
  tertiary: string;
  neutral: string;
  danger: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
  successBg: string;
  successBorder: string;
  successText: string;
  errorBg: string;
  errorBorder: string;
  errorText: string;
  infoBg: string;
  infoBorder: string;
  infoText: string;
  overlay: string;
  chipBorder: string;
  chipBg: string;
  chipText: string;
  chipSelectedBorder: string;
  chipSelectedBg: string;
  chipSelectedText: string;
  inputBg: string;
  inputText: string;
  inputPlaceholder: string;
  buttonText: string;
  ghostButtonText: string;
  modalSurface: string;
  modalSurfaceAlt: string;
  modalBorder: string;
  modalText: string;
  modalTextSoft: string;
  modalNestedSurface: string;
  modalNestedBorder: string;
  nestedSurface: string;
  nestedSurfaceBorder: string;
  texture: string;
  headerTint: string;
};

type ThemeBackground = {
  image?: any;
  imageOpacity: number;
  overlay: string;
  topGlow: string;
  bottomGlow: string;
  texture: string;
  textureBorderTop: string;
  textureBorderBottom: string;
};

type ThemeLayout = {
  maxWidthRegular: number;
  maxWidthWide: number;
  mobileLandscapeMaxWidth: number;
  modalMaxWidth: number;
};

export type AppTheme = {
  id: ThemeId;
  label: string;
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
  background: ThemeBackground;
  layout: ThemeLayout;
};

const sharedSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20
} as const;

const sharedRadius = {
  sm: 10,
  md: 12,
  lg: 18,
  xl: 22,
  pill: 999
} as const;

const sharedLayout = {
  maxWidthRegular: 980,
  maxWidthWide: 1080,
  mobileLandscapeMaxWidth: 760,
  modalMaxWidth: 640
} as const;

export const themeRegistry: Record<ThemeId, AppTheme> = {
  default_professional: {
    id: 'default_professional',
    label: 'Default Professional',
    colors: {
      bg: '#0a1520',
      surface: 'rgba(8, 18, 27, 0.74)',
      surfaceAlt: 'rgba(13, 31, 43, 0.68)',
      surfaceMuted: 'rgba(255,255,255,0.16)',
      surfaceLight: 'rgba(247,251,253,0.82)',
      surfaceLightAlt: 'rgba(255,255,255,0.78)',
      border: 'rgba(190, 220, 234, 0.38)',
      borderStrong: 'rgba(212, 235, 244, 0.58)',
      borderLight: 'rgba(16,42,67,0.16)',
      text: '#f8fcff',
      textMuted: '#e8f5fb',
      textSoft: '#d6e8f1',
      textDark: '#142a3b',
      textDarkSoft: '#465f70',
      primary: 'rgba(40,127,118,0.9)',
      secondary: 'rgba(31,82,104,0.84)',
      tertiary: 'rgba(55,106,124,0.7)',
      neutral: 'rgba(101,119,134,0.7)',
      danger: 'rgba(155,44,44,0.88)',
      warningBg: 'rgba(247, 193, 93, 0.24)',
      warningBorder: 'rgba(247, 193, 93, 0.52)',
      warningText: '#fff4d4',
      successBg: 'rgba(47,143,131,0.2)',
      successBorder: 'rgba(47,143,131,0.5)',
      successText: '#edfffb',
      errorBg: 'rgba(155,44,44,0.2)',
      errorBorder: 'rgba(230,124,124,0.5)',
      errorText: '#ffe2e2',
      infoBg: 'rgba(101, 168, 207, 0.22)',
      infoBorder: 'rgba(101, 168, 207, 0.46)',
      infoText: '#f2fbff',
      overlay: 'rgba(7, 18, 26, 0.42)',
      chipBorder: 'rgba(255,255,255,0.20)',
      chipBg: 'rgba(8,26,37,0.34)',
      chipText: '#f8fcff',
      chipSelectedBorder: '#8ec7dc',
      chipSelectedBg: 'rgba(142,199,220,0.2)',
      chipSelectedText: '#f8fcff',
      inputBg: 'rgba(246,251,253,0.98)',
      inputText: '#142a3b',
      inputPlaceholder: '#516776',
      buttonText: '#f8fcff',
      ghostButtonText: '#f8fcff',
      modalSurface: 'rgba(10, 24, 35, 0.9)',
      modalSurfaceAlt: 'rgba(15, 35, 48, 0.84)',
      modalBorder: 'rgba(142, 199, 220, 0.42)',
      modalText: '#f4fbff',
      modalTextSoft: '#c7dce7',
      modalNestedSurface: 'rgba(255,255,255,0.08)',
      modalNestedBorder: 'rgba(190, 220, 234, 0.3)',
      nestedSurface: 'rgba(239,246,250,0.78)',
      nestedSurfaceBorder: 'rgba(16,42,67,0.18)',
      texture: 'rgba(255,255,255,0.02)',
      headerTint: '#102a43'
    },
    spacing: sharedSpacing,
    radius: sharedRadius,
    background: {
      image: require('../../assets/backgrounds/river-editorial-default.png'),
      imageOpacity: 1,
      overlay: 'rgba(7, 18, 26, 0.24)',
      topGlow: 'rgba(105, 184, 204, 0.035)',
      bottomGlow: 'rgba(45, 79, 109, 0.055)',
      texture: 'rgba(255,255,255,0.018)',
      textureBorderTop: 'rgba(255,255,255,0.03)',
      textureBorderBottom: 'rgba(255,255,255,0.02)'
    },
    layout: sharedLayout
  },
  high_contrast: {
    id: 'high_contrast',
    label: 'High Contrast',
    colors: {
      bg: '#02070b',
      surface: 'rgba(5, 10, 15, 0.82)',
      surfaceAlt: 'rgba(8, 17, 24, 0.78)',
      surfaceMuted: 'rgba(255,255,255,0.18)',
      surfaceLight: 'rgba(248,253,255,0.86)',
      surfaceLightAlt: 'rgba(255,255,255,0.82)',
      border: 'rgba(255,255,255,0.34)',
      borderStrong: 'rgba(255,255,255,0.62)',
      borderLight: 'rgba(16,42,67,0.22)',
      text: '#ffffff',
      textMuted: '#f4fbff',
      textSoft: '#e4f6ff',
      textDark: '#08131c',
      textDarkSoft: '#32485a',
      primary: 'rgba(24,191,164,0.92)',
      secondary: 'rgba(11,88,117,0.88)',
      tertiary: 'rgba(17,110,136,0.76)',
      neutral: 'rgba(105,123,137,0.74)',
      danger: 'rgba(197,48,48,0.9)',
      warningBg: 'rgba(255, 196, 78, 0.28)',
      warningBorder: 'rgba(255, 196, 78, 0.62)',
      warningText: '#fff8e2',
      successBg: 'rgba(34,199,168,0.24)',
      successBorder: 'rgba(34,199,168,0.58)',
      successText: '#f0fffb',
      errorBg: 'rgba(197,48,48,0.24)',
      errorBorder: 'rgba(255,147,147,0.62)',
      errorText: '#fff0f0',
      infoBg: 'rgba(56, 189, 248, 0.24)',
      infoBorder: 'rgba(56, 189, 248, 0.58)',
      infoText: '#f2fcff',
      overlay: 'rgba(1, 6, 10, 0.62)',
      chipBorder: 'rgba(255,255,255,0.34)',
      chipBg: 'rgba(255,255,255,0.08)',
      chipText: '#ffffff',
      chipSelectedBorder: '#7dd3fc',
      chipSelectedBg: 'rgba(125,211,252,0.26)',
      chipSelectedText: '#ffffff',
      inputBg: '#f8fdff',
      inputText: '#08131c',
      inputPlaceholder: '#526471',
      buttonText: '#ffffff',
      ghostButtonText: '#ffffff',
      modalSurface: 'rgba(7, 14, 20, 0.92)',
      modalSurfaceAlt: 'rgba(13, 24, 33, 0.88)',
      modalBorder: 'rgba(255,255,255,0.42)',
      modalText: '#ffffff',
      modalTextSoft: '#d6ebf5',
      modalNestedSurface: 'rgba(255,255,255,0.08)',
      modalNestedBorder: 'rgba(255,255,255,0.22)',
      nestedSurface: 'rgba(244,251,255,0.84)',
      nestedSurfaceBorder: 'rgba(16,42,67,0.22)',
      texture: 'rgba(255,255,255,0.012)',
      headerTint: '#08131c'
    },
    spacing: sharedSpacing,
    radius: sharedRadius,
    background: {
      image: require('../../assets/backgrounds/river-editorial-contrast.png'),
      imageOpacity: 0.94,
      overlay: 'rgba(1, 6, 10, 0.48)',
      topGlow: 'rgba(125, 211, 252, 0.02)',
      bottomGlow: 'rgba(34, 197, 168, 0.03)',
      texture: 'rgba(255,255,255,0.012)',
      textureBorderTop: 'rgba(255,255,255,0.03)',
      textureBorderBottom: 'rgba(255,255,255,0.02)'
    },
    layout: sharedLayout
  },
  daylight_light: {
    id: 'daylight_light',
    label: 'Daylight Light',
    colors: {
      bg: '#eaf1f4',
      surface: 'rgba(255,255,255,0.76)',
      surfaceAlt: 'rgba(245,249,251,0.72)',
      surfaceMuted: 'rgba(16,42,67,0.1)',
      surfaceLight: 'rgba(255,255,255,0.76)',
      surfaceLightAlt: 'rgba(247,251,253,0.7)',
      border: 'rgba(16,42,67,0.22)',
      borderStrong: 'rgba(16,42,67,0.34)',
      borderLight: 'rgba(16,42,67,0.12)',
      text: '#102a43',
      textMuted: '#28465d',
      textSoft: '#446177',
      textDark: '#102a43',
      textDarkSoft: '#446177',
      primary: 'rgba(32,117,111,0.9)',
      secondary: 'rgba(39,87,107,0.86)',
      tertiary: 'rgba(59,111,130,0.72)',
      neutral: 'rgba(107,123,136,0.72)',
      danger: 'rgba(155,44,44,0.88)',
      warningBg: 'rgba(247, 193, 93, 0.18)',
      warningBorder: 'rgba(247, 193, 93, 0.42)',
      warningText: '#5d4308',
      successBg: 'rgba(35,122,115,0.12)',
      successBorder: 'rgba(35,122,115,0.28)',
      successText: '#13443f',
      errorBg: 'rgba(155,44,44,0.12)',
      errorBorder: 'rgba(196,89,89,0.30)',
      errorText: '#6d1f1f',
      infoBg: 'rgba(56, 141, 196, 0.1)',
      infoBorder: 'rgba(56, 141, 196, 0.24)',
      infoText: '#163c56',
      overlay: 'rgba(236, 243, 247, 0.46)',
      chipBorder: 'rgba(16,42,67,0.16)',
      chipBg: 'rgba(255,255,255,0.62)',
      chipText: '#102a43',
      chipSelectedBorder: '#3f91b3',
      chipSelectedBg: 'rgba(63,145,179,0.18)',
      chipSelectedText: '#102a43',
      inputBg: '#ffffff',
      inputText: '#102a43',
      inputPlaceholder: '#6a7d8a',
      buttonText: '#ffffff',
      ghostButtonText: '#102a43',
      modalSurface: 'rgba(255,255,255,0.9)',
      modalSurfaceAlt: 'rgba(243,248,251,0.82)',
      modalBorder: 'rgba(16,42,67,0.26)',
      modalText: '#102a43',
      modalTextSoft: '#446177',
      modalNestedSurface: 'rgba(243,248,251,0.72)',
      modalNestedBorder: 'rgba(16,42,67,0.2)',
      nestedSurface: 'rgba(243,248,251,0.68)',
      nestedSurfaceBorder: 'rgba(16,42,67,0.2)',
      texture: 'rgba(255,255,255,0.0)',
      headerTint: '#102a43'
    },
    spacing: sharedSpacing,
    radius: sharedRadius,
    background: {
      image: require('../../assets/backgrounds/river-editorial-daylight.png'),
      imageOpacity: 0.9,
      overlay: 'rgba(236, 243, 247, 0.34)',
      topGlow: 'rgba(116, 177, 201, 0.025)',
      bottomGlow: 'rgba(70, 130, 156, 0.025)',
      texture: 'rgba(255,255,255,0.0)',
      textureBorderTop: 'rgba(16,42,67,0.06)',
      textureBorderBottom: 'rgba(16,42,67,0.04)'
    },
    layout: sharedLayout
  }
};

const APPEARANCE_SETTING_KEY = 'appearance_theme_id';

export let appTheme: AppTheme = themeRegistry.default_professional;

const applyThemeRuntime = (themeId: ThemeId) => {
  appTheme = themeRegistry[themeId];
};

const ThemeContext = createContext<{
  themeId: ThemeId;
  theme: AppTheme;
  setThemeId: (themeId: ThemeId) => void;
  themeOptions: Array<{ id: ThemeId; label: string }>;
} | null>(null);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeId, setThemeIdState] = useState<ThemeId>('default_professional');

  useEffect(() => {
    let mounted = true;
    getAppSetting(APPEARANCE_SETTING_KEY)
      .then((storedThemeId) => {
        if (!mounted || !storedThemeId || !(storedThemeId in themeRegistry)) return;
        setThemeIdState(storedThemeId as ThemeId);
      })
      .catch(console.error);

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    applyThemeRuntime(themeId);
    setAppSetting(APPEARANCE_SETTING_KEY, themeId).catch(console.error);
  }, [themeId]);

  const value = useMemo(
    () => ({
      themeId,
      theme: themeRegistry[themeId],
      setThemeId: (nextThemeId: ThemeId) => setThemeIdState(nextThemeId),
      themeOptions: (Object.values(themeRegistry) as AppTheme[]).map((theme) => ({
        id: theme.id,
        label: theme.label
      }))
    }),
    [themeId]
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('ThemeProvider missing');
  return context;
};

export const buttonBackground = (variant: ButtonVariant, disabled?: boolean) => {
  if (disabled) return appTheme.colors.neutral;
  switch (variant) {
    case 'secondary':
      return appTheme.colors.secondary;
    case 'tertiary':
      return appTheme.colors.tertiary;
    case 'neutral':
      return appTheme.colors.neutral;
    case 'danger':
      return appTheme.colors.danger;
    case 'ghost':
      return appTheme.colors.surfaceMuted;
    case 'primary':
    default:
      return appTheme.colors.primary;
  }
};

export const buttonTextColor = (variant: ButtonVariant) =>
  variant === 'ghost' ? appTheme.colors.ghostButtonText : appTheme.colors.buttonText;

