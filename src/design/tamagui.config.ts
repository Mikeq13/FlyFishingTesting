import { config as baseConfig } from '@tamagui/config/v3';
import { createTamagui } from 'tamagui';
import { themeRegistry } from './theme';

const buildTamaguiTheme = (themeId: keyof typeof themeRegistry) => {
  const appTheme = themeRegistry[themeId];
  const isLight = themeId === 'daylight_light';
  const baseTheme = isLight ? baseConfig.themes.light : baseConfig.themes.dark;

  return {
    ...baseTheme,
    background: appTheme.colors.surface,
    backgroundHover: appTheme.colors.surfaceAlt,
    backgroundPress: appTheme.colors.surfaceMuted,
    backgroundFocus: appTheme.colors.surfaceAlt,
    borderColor: appTheme.colors.border,
    borderColorHover: appTheme.colors.borderStrong,
    color: appTheme.colors.text,
    colorHover: appTheme.colors.text,
    colorPress: appTheme.colors.textSoft,
    colorFocus: appTheme.colors.text,
    placeholderColor: appTheme.colors.inputPlaceholder,
    shadowColor: appTheme.colors.overlay
  };
};

export const tamaguiConfig = createTamagui({
  ...baseConfig,
  themes: {
    ...baseConfig.themes,
    default_professional: buildTamaguiTheme('default_professional'),
    high_contrast: buildTamaguiTheme('high_contrast'),
    daylight_light: buildTamaguiTheme('daylight_light')
  }
});

export default tamaguiConfig;

type AppTamaguiConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppTamaguiConfig {}
}

