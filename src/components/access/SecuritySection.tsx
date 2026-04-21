import React from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { ActionGroup } from '@/components/ui/ActionGroup';
import { AppButton } from '@/components/ui/AppButton';
import { FormField, getFormInputStyle } from '@/components/ui/FormField';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { SectionCard } from '@/components/ui/SectionCard';
import { useTheme } from '@/design/theme';
import { AuthStatus, MfaFactorSummary, PendingTotpEnrollment, RemoteSessionSnapshot } from '@/types/remote';

export const SecuritySection = ({
  ownerLinked,
  isAuthenticatedOwner,
  showOwnerIdentityTools,
  remoteSession,
  authStatus,
  pendingTotpEnrollment,
  mfaFactors,
  mfaAssuranceLevel,
  passwordResetEmail,
  onPasswordResetEmailChange,
  mfaFriendlyName,
  onMfaFriendlyNameChange,
  mfaCode,
  onMfaCodeChange,
  onSendPasswordReset,
  onLinkOwnerIdentity,
  onEnrollTotp,
  onVerifyTotp,
  onRemoveMfaFactor,
  onRefreshMfaState,
  onSignOut,
  embedded = false
}: {
  ownerLinked: boolean;
  isAuthenticatedOwner: boolean;
  showOwnerIdentityTools: boolean;
  remoteSession: RemoteSessionSnapshot | null;
  authStatus: AuthStatus;
  pendingTotpEnrollment: PendingTotpEnrollment | null;
  mfaFactors: MfaFactorSummary[];
  mfaAssuranceLevel: 'aal1' | 'aal2' | 'unknown';
  passwordResetEmail: string;
  onPasswordResetEmailChange: (value: string) => void;
  mfaFriendlyName: string;
  onMfaFriendlyNameChange: (value: string) => void;
  mfaCode: string;
  onMfaCodeChange: (value: string) => void;
  onSendPasswordReset: () => Promise<void>;
  onLinkOwnerIdentity: () => Promise<void>;
  onEnrollTotp: () => Promise<void>;
  onVerifyTotp: () => Promise<void>;
  onRemoveMfaFactor: (factorId: string) => Promise<void>;
  onRefreshMfaState: () => Promise<void>;
  onSignOut: () => Promise<void>;
  embedded?: boolean;
}) => {
  const { theme } = useTheme();
  const formInputStyle = getFormInputStyle();
  const isDaylightTheme = theme.id === 'daylight_light';
  const elevatedTextColor = isDaylightTheme ? theme.colors.textDark : theme.colors.text;
  const elevatedSoftTextColor = isDaylightTheme ? theme.colors.textDarkSoft : theme.colors.textSoft;
  const elevatedSurface = isDaylightTheme ? theme.colors.nestedSurface : theme.colors.surfaceAlt;
  const elevatedBorder = isDaylightTheme ? theme.colors.nestedSurfaceBorder : theme.colors.borderStrong;

  const runAction = async (action: () => Promise<void>, successTitle: string, successMessage: string) => {
    try {
      await action();
      Alert.alert(successTitle, successMessage);
    } catch (error) {
      Alert.alert('Unable to finish action', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const content = (
    <>
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
        <InlineSummaryRow
          label="Email Verification"
          value={remoteSession?.emailVerifiedAt ? 'Verified' : authStatus === 'pending_verification' ? 'Pending' : 'Not verified'}
          valueMuted={!remoteSession?.emailVerifiedAt}
          tone="light"
        />
        <InlineSummaryRow label="MFA" value={mfaFactors.length ? `${mfaFactors.length} factor${mfaFactors.length === 1 ? '' : 's'}` : 'Not enrolled'} valueMuted={!mfaFactors.length} tone="light" />
        <InlineSummaryRow label="MFA Level" value={mfaAssuranceLevel.toUpperCase()} valueMuted={mfaAssuranceLevel === 'unknown'} tone="light" />
        {showOwnerIdentityTools ? (
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
        ) : null}
      </View>

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
          {showOwnerIdentityTools ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: elevatedTextColor, fontWeight: '800', fontSize: 16 }}>Owner Verification</Text>
              <Text style={{ color: elevatedSoftTextColor, lineHeight: 20 }}>
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
          ) : null}

          <View style={{ gap: 8 }}>
            <Text style={{ color: elevatedTextColor, fontWeight: '800', fontSize: 16 }}>Multi-Factor Authentication</Text>
            <Text style={{ color: elevatedSoftTextColor, lineHeight: 20 }}>
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
                backgroundColor: elevatedSurface,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: elevatedBorder
              }}
              >
                <Text style={{ color: elevatedTextColor, fontWeight: '700' }}>Finish TOTP Setup</Text>
                {pendingTotpEnrollment.secret ? <Text style={{ color: elevatedSoftTextColor }}>Secret: {pendingTotpEnrollment.secret}</Text> : null}
                {pendingTotpEnrollment.uri ? <Text style={{ color: elevatedSoftTextColor }}>URI: {pendingTotpEnrollment.uri}</Text> : null}
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
                backgroundColor: elevatedSurface,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: elevatedBorder
              }}
              >
                <Text style={{ color: elevatedTextColor, fontWeight: '700' }}>{factor.friendlyName ?? 'Authenticator App'}</Text>
                <Text style={{ color: elevatedSoftTextColor }}>Status: {factor.status}</Text>
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
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <SectionCard title="Security" subtitle="Keep recovery, MFA, and owner verification separate from basic account information." tone="light">
      {content}
    </SectionCard>
  );
};
