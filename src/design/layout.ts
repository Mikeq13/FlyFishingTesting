import { Platform, useWindowDimensions } from 'react-native';
import { useTheme } from '@/design/theme';

export const useResponsiveLayout = () => {
  const { width, height } = useWindowDimensions();
  const { theme } = useTheme();
  const isLandscape = width > height;
  const isCompactLayout = width < 720;
  const isMediumLayout = width >= 720 && width < 1100;
  const isWideLayout = width >= 1100;
  const horizontalPadding = width < 400 ? theme.spacing.md : theme.spacing.lg;
  const contentMaxWidth =
    Platform.OS === 'web'
      ? isWideLayout
        ? theme.layout.maxWidthWide
        : isMediumLayout
          ? theme.layout.maxWidthRegular
          : undefined
      : isLandscape && width >= theme.layout.mobileLandscapeMaxWidth
        ? theme.layout.mobileLandscapeMaxWidth
        : undefined;
  const modalMaxWidth = Math.min(width - horizontalPadding * 2, theme.layout.modalMaxWidth);

  return {
    width,
    height,
    isLandscape,
    isCompactLayout,
    isMediumLayout,
    isWideLayout,
    horizontalPadding,
    contentMaxWidth,
    modalMaxWidth,
    stackDirection: (isCompactLayout ? 'column' : 'row') as 'column' | 'row',
    buildScrollContentStyle: ({
      gap = theme.spacing.md,
      bottomPadding = theme.spacing.xl * 2,
      centered = false
    }: {
      gap?: number;
      bottomPadding?: number;
      centered?: boolean;
    } = {}) => ({
      flexGrow: 1,
      justifyContent: centered ? ('center' as const) : ('flex-start' as const),
      padding: horizontalPadding,
      paddingBottom: bottomPadding,
      gap,
      width: '100%' as const,
      alignSelf: 'center' as const,
      maxWidth: contentMaxWidth
    })
  };
};
