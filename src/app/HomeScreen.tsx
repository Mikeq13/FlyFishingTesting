import React from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { KeyboardDismissView } from '@/components/KeyboardDismissView';
import { ScreenBackground } from '@/components/ScreenBackground';
import { AppButton } from '@/components/ui/AppButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { useTheme } from '@/design/theme';
import { useAppStore } from './store';
import { SessionMode } from '@/types/session';
import { useResponsiveLayout } from '@/design/layout';

const SESSION_MODE_OPTIONS: Array<{
  mode: SessionMode;
  title: string;
  description: string;
}> = [
  {
    mode: 'experiment',
    title: 'Experiment Journal',
    description: 'Run baseline and test fly experiments with deeper controls, hypotheses, and research-style logging.'
  },
  {
    mode: 'practice',
    title: 'Practice Session',
    description: 'Keep it lightweight for a practice day and get ready for quicker catch logging built around saved flies.'
  },
  {
    mode: 'competition',
    title: 'Competition',
    description: 'Use a comp-focused session flow today, with the data model ready for future shared intel and teammate comparison.'
  }
];

export const HomeScreen = ({ navigation }: any) => {
  const { currentHasPremiumAccess, currentUser, remoteSession } = useAppStore();
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const [showSessionChooser, setShowSessionChooser] = React.useState(false);
  const shouldCenterContent = Platform.OS !== 'web' && !layout.isCompactLayout;
  const contentContainerStyle = layout.buildScrollContentStyle({
    centered: shouldCenterContent,
    gap: 14,
    bottomPadding: 40
  });

  const beginSession = (mode: SessionMode) => {
    setShowSessionChooser(false);
    navigation.navigate('Session', { mode });
  };

  return (
    <ScreenBackground>
      <KeyboardDismissView>
      <ScrollView contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Fishing Lab"
          subtitle="A fly fishing journal designed to help you improve with insights, coaching, and shared learning."
          eyebrow="On The Water"
        />
        <SectionCard>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
            Active Account
          </Text>
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 24 }}>{currentUser?.name ?? 'Loading...'}</Text>
          <Text style={{ color: theme.colors.textSoft }}>
            Signed in as: {remoteSession?.email ?? 'No account linked'}
          </Text>
        </SectionCard>
        <View style={{ flexDirection: layout.stackDirection, gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppButton label="Start Session" onPress={() => setShowSessionChooser(true)} variant="secondary" />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton label="View History" onPress={() => navigation.navigate('History')} variant="secondary" />
          </View>
        </View>
        {[
          [`View Insights${currentHasPremiumAccess ? '' : ' (Premium)'}`, 'Insights'],
          [`Ask AI Coach${currentHasPremiumAccess ? '' : ' (Premium)'}`, 'Coach'],
          ['Settings', 'Access']
        ].map(([label, route]) => (
          <AppButton key={route} label={label} onPress={() => navigation.navigate(route)} variant="tertiary" />
        ))}
      </ScrollView>
      </KeyboardDismissView>
      <Modal visible={showSessionChooser} transparent animationType="fade" onRequestClose={() => setShowSessionChooser(false)}>
        <View style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', padding: 20 }}>
          <View
            style={{
              backgroundColor: theme.colors.modalSurface,
              borderRadius: 22,
              padding: 18,
              gap: 12,
              borderWidth: 1,
              borderColor: theme.colors.borderStrong,
              width: '100%',
              maxWidth: layout.modalMaxWidth,
              alignSelf: 'center'
            }}
          >
            <View style={{ gap: 4 }}>
              <Text style={{ color: theme.colors.textDark, fontSize: 24, fontWeight: '800' }}>What are you doing today?</Text>
              <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
                Choose the session style that best matches today’s water and how you want to log intel.
              </Text>
            </View>

            {SESSION_MODE_OPTIONS.map((option) => (
              <Pressable
                key={option.mode}
                onPress={() => beginSession(option.mode)}
                style={{
                backgroundColor: theme.colors.nestedSurface,
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: theme.colors.nestedSurfaceBorder,
                gap: 4
              }}
              >
                <Text style={{ color: theme.colors.textDark, fontWeight: '800', fontSize: 17 }}>{option.title}</Text>
                <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 19 }}>{option.description}</Text>
              </Pressable>
            ))}

            <AppButton label="Cancel" onPress={() => setShowSessionChooser(false)} variant="ghost" />
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
};

export default HomeScreen;
