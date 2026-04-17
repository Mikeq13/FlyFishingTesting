export const appTheme = {
  colors: {
    bg: '#08161f',
    surface: 'rgba(8, 28, 41, 0.78)',
    surfaceAlt: 'rgba(11, 38, 58, 0.72)',
    surfaceMuted: 'rgba(255,255,255,0.08)',
    surfaceLight: 'rgba(245,252,255,0.96)',
    border: 'rgba(202,240,248,0.16)',
    borderStrong: 'rgba(202,240,248,0.24)',
    text: '#f7fdff',
    textMuted: '#d7f3ff',
    textSoft: '#bde6f6',
    textDark: '#102a43',
    textDarkSoft: '#486581',
    primary: '#2a9d8f',
    secondary: '#1d3557',
    tertiary: '#264653',
    neutral: '#5b7282',
    danger: '#8d0801',
    warningBg: 'rgba(252,211,77,0.22)',
    warningBorder: 'rgba(252,211,77,0.4)',
    warningText: '#fff7d6',
    successBg: 'rgba(42,157,143,0.18)',
    successBorder: 'rgba(42,157,143,0.42)',
    successText: '#ecfffb',
    errorBg: 'rgba(145,48,48,0.18)',
    errorBorder: 'rgba(247,148,148,0.38)',
    errorText: '#ffdede',
    overlay: 'rgba(5, 18, 28, 0.62)',
    chipBorder: 'rgba(255,255,255,0.22)',
    chipBg: 'rgba(6,28,41,0.5)',
    chipSelectedBorder: '#84d9f4',
    chipSelectedBg: 'rgba(132,217,244,0.28)',
    inputBg: 'rgba(245,252,255,0.96)'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20
  },
  radius: {
    sm: 10,
    md: 12,
    lg: 18,
    xl: 22,
    pill: 999
  }
} as const;

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'neutral' | 'danger' | 'ghost';

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
