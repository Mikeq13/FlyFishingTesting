import React from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { FormField, getFormInputStyle } from '@/components/ui/FormField';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { useTheme } from '@/design/theme';
import { AuthStatus, RemoteSessionSnapshot } from '@/types/remote';
import { hasSupabaseConfig } from '@/services/supabaseClient';

export const AccountSecuritySection = ({
  currentUserName,
  currentEntitlementLabel,
  remoteSession,
  authStatus,
  accountName,
  onAccountNameChange,
  accountEmail,
  onAccountEmailChange,
  onSaveName,
  onUpdateEmail,
  embedded = false,
  nestedEditControls = false
}: {
  currentUserName: string;
  currentEntitlementLabel: string;
  remoteSession: RemoteSessionSnapshot | null;
  authStatus: AuthStatus;
  accountName: string;
  onAccountNameChange: (value: string) => void;
  accountEmail: string;
  onAccountEmailChange: (value: string) => void;
  onSaveName: () => Promise<void>;
  onUpdateEmail: () => Promise<void>;
  embedded?: boolean;
  nestedEditControls?: boolean;
}) => {
  const { theme } = useTheme();
  const formInputStyle = getFormInputStyle();
  const isDaylightTheme = theme.id === 'daylight_light';
  const elevatedTextColor = isDaylightTheme ? theme.colors.textDark : theme.colors.text;
  const elevatedSoftTextColor = isDaylightTheme ? theme.colors.textDarkSoft : theme.colors.textSoft;
  const elevatedSurface = isDaylightTheme ? theme.colors.nestedSurface : theme.colors.surfaceAlt;
  const elevatedBorder = isDaylightTheme ? theme.colors.nestedSurfaceBorder : theme.colors.borderStrong;
  const [editExpanded, setEditExpanded] = React.useState(false);

  const runAction = async (action: () => Promise<void>, successTitle: string, successMessage: string) => {
    try {
      await action();
      Alert.alert(successTitle, successMessage);
    } catch (error) {
      Alert.alert('Unable to finish action', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const accountIdentity = remoteSession ? 'Signed-in cloud account' : 'Local profile only';

  const content = (
    <>
      <View
        style={{
          gap: 4,
          backgroundColor: elevatedSurface,
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: elevatedBorder
        }}
      >
        <InlineSummaryRow label="Active Angler" value={currentUserName} tone="light" />
        <InlineSummaryRow label="Signed In Email" value={remoteSession?.email ?? 'Not signed in'} valueMuted={!remoteSession?.email} tone="light" />
        <InlineSummaryRow label="Account Identity" value={accountIdentity} valueMuted={!remoteSession} tone="light" />
        <InlineSummaryRow label="Access Type" value={currentEntitlementLabel} tone="light" />
      </View>

      {!remoteSession ? (
        <StatusBanner tone="warning" text={hasSupabaseConfig ? 'Sign in before using shared sync, competitions, or account recovery tools.' : 'This device is missing the Supabase values required for account access, email recovery, and shared sync.'} />
      ) : null}
      {authStatus === 'pending_verification' ? (
        <StatusBanner tone="info" text="Check your inbox and finish the verification step. Some account changes stay pending until that email step completes." />
      ) : null}

      {nestedEditControls ? (
        <View
          style={{
            gap: 8,
            borderRadius: 12,
            padding: 12,
            backgroundColor: elevatedSurface,
            borderWidth: 1,
            borderColor: elevatedBorder
          }}
        >
          <Pressable
            onPress={() => setEditExpanded((current) => !current)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: elevatedTextColor, fontWeight: '800' }}>Edit Account</Text>
              <Text style={{ color: elevatedSoftTextColor, lineHeight: 18 }}>
                Update your account name or email without leaving this section open all the time.
              </Text>
            </View>
            <Text style={{ color: elevatedTextColor, fontSize: 18, fontWeight: '800' }}>{editExpanded ? '-' : '+'}</Text>
          </Pressable>
          {editExpanded ? (
            <>
              <FormField label="Account Name" tone="light">
                <TextInput value={accountName} onChangeText={onAccountNameChange} placeholder="Your name" placeholderTextColor={theme.colors.inputPlaceholder} style={formInputStyle} />
              </FormField>
              <AppButton label="Save Name" onPress={() => runAction(onSaveName, 'Account updated', 'Your account name and angler profile label were updated.')} surfaceTone="light" />

              <FormField label="Change Email" tone="light">
                <TextInput
                  value={accountEmail}
                  onChangeText={onAccountEmailChange}
                  placeholder="angler@email.com"
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={formInputStyle}
                />
              </FormField>
              <AppButton label="Update Email" onPress={() => runAction(onUpdateEmail, 'Verification needed', 'Check your inbox to confirm the email change.')} surfaceTone="light" />
            </>
          ) : null}
        </View>
      ) : (
        <>
          <FormField label="Account Name" tone="light">
            <TextInput value={accountName} onChangeText={onAccountNameChange} placeholder="Your name" placeholderTextColor={theme.colors.inputPlaceholder} style={formInputStyle} />
          </FormField>
          <AppButton label="Save Name" onPress={() => runAction(onSaveName, 'Account updated', 'Your account name and angler profile label were updated.')} surfaceTone="light" />

          <FormField label="Change Email" tone="light">
            <TextInput
              value={accountEmail}
              onChangeText={onAccountEmailChange}
              placeholder="angler@email.com"
              placeholderTextColor={theme.colors.inputPlaceholder}
              autoCapitalize="none"
              keyboardType="email-address"
              style={formInputStyle}
            />
          </FormField>
          <AppButton label="Update Email" onPress={() => runAction(onUpdateEmail, 'Verification needed', 'Check your inbox to confirm the email change.')} surfaceTone="light" />
        </>
      )}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <SectionCard title="Account Information" subtitle="Keep identity and access details in one place instead of repeating them across the app." tone="light">
      {content}
    </SectionCard>
  );
};
