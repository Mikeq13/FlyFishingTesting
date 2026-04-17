import React from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { ActionGroup } from '@/components/ui/ActionGroup';
import { FormField, getFormInputStyle } from '@/components/ui/FormField';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { useTheme } from '@/design/theme';
import { AuthStatus, MfaFactorSummary, PendingTotpEnrollment, RemoteSessionSnapshot } from '@/types/remote';
import { hasSupabaseConfig } from '@/services/supabaseClient';

export const AccountSecuritySection = ({
  currentUserName,
  ownerLinked,
  isAuthenticatedOwner,
  remoteSession,
  authStatus,
  pendingTotpEnrollment,
  mfaFactors,
  mfaAssuranceLevel,
  accountName,
  onAccountNameChange,
  accountEmail,
  onAccountEmailChange,
  passwordResetEmail,
  onPasswordResetEmailChange,
  mfaFriendlyName,
  onMfaFriendlyNameChange,
  mfaCode,
  onMfaCodeChange,
  onSaveName,
  onUpdateEmail,
  onSendPasswordReset,
  onSendMagicLink,
  onLinkOwnerIdentity,
  onEnrollTotp,
  onVerifyTotp,
  onRemoveMfaFactor,
  onRefreshMfaState,
  onSignOut
}: {
  currentUserName: string;
  ownerLinked: boolean;
  isAuthenticatedOwner: boolean;
  remoteSession: RemoteSessionSnapshot | null;
  authStatus: AuthStatus;
  pendingTotpEnrollment: PendingTotpEnrollment | null;
  mfaFactors: MfaFactorSummary[];
  mfaAssuranceLevel: 'aal1' | 'aal2' | 'unknown';
  accountName: string;
  onAccountNameChange: (value: string) => void;
  accountEmail: string;
  onAccountEmailChange: (value: string) => void;
  passwordResetEmail: string;
  onPasswordResetEmailChange: (value: string) => void;
  mfaFriendlyName: string;
  onMfaFriendlyNameChange: (value: string) => void;
  mfaCode: string;
  onMfaCodeChange: (value: string) => void;
  onSaveName: () => Promise<void>;
  onUpdateEmail: () => Promise<void>;
  onSendPasswordReset: () => Promise<void>;
  onSendMagicLink: () => Promise<void>;
  onLinkOwnerIdentity: () => Promise<void>;
  onEnrollTotp: () => Promise<void>;
  onVerifyTotp: () => Promise<void>;
  onRemoveMfaFactor: (factorId: string) => Promise<void>;
  onRefreshMfaState: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) => {
  const { theme } = useTheme();
  const formInputStyle = getFormInputStyle();

  const runAction = async (action: () => Promise<void>, successTitle: string, successMessage: string) => {
    try {
      await action();
      Alert.alert(successTitle, successMessage);
    } catch (error) {
      Alert.alert('Unable to finish action', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <SectionCard title="Account & Security" subtitle="Your identity, recovery options, and owner verification all live here." tone="light">
      <View
        style={{
          gap: 8,
          backgroundColor: theme.colors.nestedSurface,
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: theme.colors.nestedSurfaceBorder
        }}
      >
        <InlineSummaryRow label="Angler Profile" value={currentUserName} tone="light" />
        <InlineSummaryRow label="Signed In Email" value={remoteSession?.email ?? 'Not signed in'} valueMuted={!remoteSession?.email} tone="light" />
        <InlineSummaryRow
          label="Email Verification"
          value={remoteSession?.emailVerifiedAt ? 'Verified' : authStatus === 'pending_verification' ? 'Pending' : 'Not verified'}
          valueMuted={!remoteSession?.emailVerifiedAt}
          tone="light"
        />
        <InlineSummaryRow label="MFA" value={mfaFactors.length ? `${mfaFactors.length} factor${mfaFactors.length === 1 ? '' : 's'}` : 'Not enrolled'} valueMuted={!mfaFactors.length} tone="light" />
        <InlineSummaryRow label="MFA Level" value={mfaAssuranceLevel.toUpperCase()} valueMuted={mfaAssuranceLevel === 'unknown'} tone="light" />
        <InlineSummaryRow
          label="Owner Identity"
          value={
            isAuthenticatedOwner
              ? 'Verified owner session'
              : ownerLinked
                ? 'Linked, but this session is not the owner'
                : 'Owner identity not linked yet'
          }
          valueMuted={!isAuthenticatedOwner}
          tone="light"
        />
      </View>

      {!remoteSession ? (
        <StatusBanner tone="warning" text={hasSupabaseConfig ? 'Cloud sign-in is optional here. Local testing stays available, and shared sync turns on after you sign in.' : 'This device is running in local mode. Add Supabase env values later if you want cloud sign-in, email recovery, or shared sync.'} />
      ) : null}
      {authStatus === 'pending_verification' ? (
        <StatusBanner tone="info" text="Check your inbox and finish the verification step. Some account changes stay pending until that email step completes." />
      ) : null}
      <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
        Signing in proves identity for cloud sync. Local owner testing still works without it, but cloud recovery, MFA, and remote account linking need a signed-in session.
      </Text>

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
      <ActionGroup>
        <AppButton label="Update Email" onPress={() => runAction(onUpdateEmail, 'Verification needed', 'Check your inbox to confirm the email change.')} surfaceTone="light" />
        <AppButton label="Send Magic Link" onPress={() => runAction(onSendMagicLink, 'Magic link sent', 'Open the link from this email on this device to finish signing in.')} variant="secondary" surfaceTone="light" />
      </ActionGroup>

      <FormField label="Password Recovery Email" tone="light">
        <TextInput
          value={passwordResetEmail}
          onChangeText={onPasswordResetEmailChange}
          placeholder="angler@email.com"
          placeholderTextColor={theme.colors.inputPlaceholder}
          autoCapitalize="none"
          keyboardType="email-address"
          style={formInputStyle}
        />
      </FormField>
      <AppButton label="Send Password Reset" onPress={() => runAction(onSendPasswordReset, 'Reset email sent', 'Open the recovery email to set a new password.')} variant="tertiary" surfaceTone="light" />

      {remoteSession ? (
        <>
          <View style={{ gap: 8 }}>
            <Text style={{ color: theme.colors.textDark, fontWeight: '800', fontSize: 16 }}>Owner Verification</Text>
            <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
              Link the owner profile to your signed-in email once, then owner tools only unlock when this same account is signed in.
            </Text>
            <AppButton
              label={ownerLinked ? (isAuthenticatedOwner ? 'Owner Identity Linked' : 'Refresh Owner Link') : 'Link Owner Identity'}
              onPress={() =>
                runAction(
                  onLinkOwnerIdentity,
                  'Owner identity linked',
                  'This signed-in account is now the one that unlocks owner controls for the owner profile.'
                )
              }
              disabled={isAuthenticatedOwner}
              surfaceTone="light"
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: theme.colors.textDark, fontWeight: '800', fontSize: 16 }}>Multi-Factor Authentication</Text>
            <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
              Add a TOTP authenticator factor if your Supabase project supports MFA. This strengthens owner and tester account security.
            </Text>
            <FormField label="Authenticator Label" tone="light">
              <TextInput value={mfaFriendlyName} onChangeText={onMfaFriendlyNameChange} placeholder="Fishing Lab Authenticator" placeholderTextColor={theme.colors.inputPlaceholder} style={formInputStyle} />
            </FormField>
            <ActionGroup>
              <AppButton label="Start TOTP Setup" onPress={() => runAction(onEnrollTotp, 'MFA setup started', 'Use the secret or QR data below in your authenticator app, then verify the code.')} surfaceTone="light" />
              <AppButton label="Refresh MFA Status" onPress={() => runAction(onRefreshMfaState, 'MFA refreshed', 'Account security factors were refreshed from Supabase.')} variant="secondary" surfaceTone="light" />
            </ActionGroup>
            {pendingTotpEnrollment ? (
              <View
                style={{
                  gap: 8,
                  backgroundColor: theme.colors.nestedSurface,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.nestedSurfaceBorder
                }}
              >
                <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>Finish TOTP Setup</Text>
                {pendingTotpEnrollment.secret ? <Text style={{ color: theme.colors.textDarkSoft }}>Secret: {pendingTotpEnrollment.secret}</Text> : null}
                {pendingTotpEnrollment.uri ? <Text style={{ color: theme.colors.textDarkSoft }}>URI: {pendingTotpEnrollment.uri}</Text> : null}
                <FormField label="Authenticator Code" tone="light">
                  <TextInput value={mfaCode} onChangeText={onMfaCodeChange} keyboardType="number-pad" placeholder="123456" placeholderTextColor={theme.colors.inputPlaceholder} style={formInputStyle} />
                </FormField>
                <AppButton label="Verify TOTP" onPress={() => runAction(onVerifyTotp, 'MFA enabled', 'Your authenticator is now linked to this account.')} surfaceTone="light" />
              </View>
            ) : null}
            {mfaFactors.map((factor) => (
              <View
                key={factor.id}
                style={{
                  gap: 6,
                  backgroundColor: theme.colors.nestedSurface,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.nestedSurfaceBorder
                }}
              >
                <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>{factor.friendlyName ?? 'Authenticator App'}</Text>
                <Text style={{ color: theme.colors.textDarkSoft }}>Status: {factor.status}</Text>
                <AppButton
                  label="Remove Factor"
                  onPress={() => runAction(() => onRemoveMfaFactor(factor.id), 'MFA removed', 'The factor was removed from this account.')}
                  variant="danger"
                  surfaceTone="light"
                />
              </View>
            ))}
          </View>

          <AppButton
            label="Sign Out"
            onPress={() => runAction(onSignOut, 'Signed out', 'This device is no longer authenticated for shared sync.')}
            variant="danger"
            surfaceTone="light"
          />
        </>
      ) : null}
    </SectionCard>
  );
};
