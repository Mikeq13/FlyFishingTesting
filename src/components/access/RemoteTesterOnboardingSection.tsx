import React from 'react';
import { Alert, Share, Text, TextInput, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { FormField, getFormInputStyle } from '@/components/ui/FormField';
import { SectionCard } from '@/components/ui/SectionCard';
import { useTheme } from '@/design/theme';

export const buildTesterInviteMessage = ({
  iosUrl,
  androidUrl,
  accessCode,
  note
}: {
  iosUrl: string;
  androidUrl: string;
  accessCode: string;
  note: string;
}) => {
  const lines = [
    'Fishing Lab beta install',
    iosUrl.trim() ? `iPhone install: ${iosUrl.trim()}` : null,
    androidUrl.trim() ? `Android install: ${androidUrl.trim()}` : null,
    'After install, open the app and create or sign in to your account.',
    accessCode.trim() ? `After sign-in, use this group or invite code: ${accessCode.trim()}` : null,
    note.trim() ? note.trim() : null
  ].filter((line): line is string => !!line);

  return lines.join('\n');
};

export const RemoteTesterOnboardingSection = ({
  iosPreviewUrl,
  onIosPreviewUrlChange,
  androidPreviewUrl,
  onAndroidPreviewUrlChange,
  accessCode,
  onAccessCodeChange,
  onboardingNote,
  onOnboardingNoteChange,
  onSave
}: {
  iosPreviewUrl: string;
  onIosPreviewUrlChange: (value: string) => void;
  androidPreviewUrl: string;
  onAndroidPreviewUrlChange: (value: string) => void;
  accessCode: string;
  onAccessCodeChange: (value: string) => void;
  onboardingNote: string;
  onOnboardingNoteChange: (value: string) => void;
  onSave: () => Promise<void>;
}) => {
  const { theme } = useTheme();
  const formInputStyle = getFormInputStyle();
  const isDaylightTheme = theme.id === 'daylight_light';
  const elevatedTextColor = isDaylightTheme ? theme.colors.textDark : theme.colors.text;
  const elevatedSoftTextColor = isDaylightTheme ? theme.colors.textDarkSoft : theme.colors.textSoft;
  const elevatedSurface = isDaylightTheme ? theme.colors.nestedSurface : theme.colors.surfaceAlt;
  const elevatedBorder = isDaylightTheme ? theme.colors.nestedSurfaceBorder : theme.colors.borderStrong;
  const testerInviteMessage = buildTesterInviteMessage({
    iosUrl: iosPreviewUrl,
    androidUrl: androidPreviewUrl,
    accessCode,
    note: onboardingNote
  });

  const shareTesterMessage = async () => {
    try {
      await Share.share({ message: testerInviteMessage });
    } catch (error) {
      Alert.alert('Unable to open share sheet', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const saveLinks = async () => {
    try {
      await onSave();
      Alert.alert('Remote install details saved', 'These iPhone and Android install details will stay ready for your next tester invite.');
    } catch (error) {
      Alert.alert('Unable to save install details', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const content = (
    <>
      <Text style={{ color: elevatedSoftTextColor, lineHeight: 20 }}>
        Keep your current iPhone preview link, Android APK link, and any group or invite code here so you can send one clean tester message without rebuilding the instructions every time.
      </Text>
      <FormField label="iPhone Preview Link" tone="light">
        <TextInput
          value={iosPreviewUrl}
          onChangeText={onIosPreviewUrlChange}
          placeholder="Paste iPhone internal build link"
          placeholderTextColor={theme.colors.inputPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          style={formInputStyle}
        />
      </FormField>
      <FormField label="Android Preview / APK Link" tone="light">
        <TextInput
          value={androidPreviewUrl}
          onChangeText={onAndroidPreviewUrlChange}
          placeholder="Paste Android internal build or APK link"
          placeholderTextColor={theme.colors.inputPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          style={formInputStyle}
        />
      </FormField>
      <FormField label="Group or Invite Code" tone="light">
        <TextInput
          value={accessCode}
          onChangeText={onAccessCodeChange}
          placeholder="Optional group or invite code"
          placeholderTextColor={theme.colors.inputPlaceholder}
          autoCapitalize="characters"
          style={formInputStyle}
        />
      </FormField>
      <FormField label="Tester Note" tone="light">
        <TextInput
          value={onboardingNote}
          onChangeText={onOnboardingNoteChange}
          placeholder="Optional short note for testers"
          placeholderTextColor={theme.colors.inputPlaceholder}
          multiline
          style={[formInputStyle, { minHeight: 88, textAlignVertical: 'top' }]}
        />
      </FormField>
      <AppButton label="Save Install Details" onPress={() => { saveLinks().catch(console.error); }} surfaceTone="light" />
      <AppButton label="Share Tester Message" onPress={() => { shareTesterMessage().catch(console.error); }} variant="secondary" surfaceTone="light" />
      <View
        style={{
          gap: 8,
          backgroundColor: elevatedSurface,
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: elevatedBorder
        }}
      >
        <Text style={{ color: elevatedTextColor, fontWeight: '700' }}>Preview Message</Text>
        <Text style={{ color: elevatedSoftTextColor, lineHeight: 20 }}>{testerInviteMessage}</Text>
      </View>
    </>
  );

  return (
    <SectionCard title="Remote Tester Onboarding" subtitle="Store the install links and share one clean tester message for iPhone or Android." tone="light">
      {content}
    </SectionCard>
  );
};
