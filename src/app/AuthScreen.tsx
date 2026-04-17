import React from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { FormField, getFormInputStyle } from '@/components/ui/FormField';
import { AppButton } from '@/components/ui/AppButton';
import { OptionChips } from '@/components/OptionChips';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { useTheme } from '@/design/theme';
import { useResponsiveLayout } from '@/design/layout';
import { useAppStore } from './store';
import { cloudFeaturesUnavailableMessage, hasSupabaseConfig, missingSupabaseConfigMessage } from '@/services/supabaseClient';

type AuthMode = 'sign_in' | 'sign_up' | 'magic_link' | 'reset';

export const AuthScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const {
    authStatus,
    signInWithPassword,
    signUpWithPassword,
    signInWithMagicLink,
    sendPasswordResetEmail,
    updatePassword
  } = useAppStore();
  const formInputStyle = getFormInputStyle();
  const [mode, setMode] = React.useState<AuthMode>('sign_in');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const submit = async () => {
    if (!hasSupabaseConfig) {
      Alert.alert('Supabase config missing', missingSupabaseConfigMessage);
      return;
    }
    setIsSubmitting(true);
    try {
      if (authStatus === 'password_reset_required') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        await updatePassword(password);
        Alert.alert('Password updated', 'Your password has been updated. You can keep using the app.');
        setPassword('');
        setConfirmPassword('');
        return;
      }

      if (mode === 'sign_up') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        await signUpWithPassword({ email, password, name });
        Alert.alert('Check your inbox', 'Verify your email if prompted, then come back and sign in.');
        return;
      }

      if (mode === 'sign_in') {
        await signInWithPassword({ email, password });
        return;
      }

      if (mode === 'magic_link') {
        await signInWithMagicLink(email);
        Alert.alert('Magic link sent', 'Open the link from this email on this device to finish signing in.');
        return;
      }

      await sendPasswordResetEmail(email);
      Alert.alert('Reset link sent', 'Check your inbox for the password reset link.');
    } catch (error) {
      Alert.alert('Unable to continue', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusText =
    authStatus === 'pending_verification'
      ? 'Check your email and finish the verification or magic-link step before continuing.'
      : authStatus === 'password_reset_required'
        ? 'Choose a new password to finish the recovery flow.'
        : 'Sign in with your real account so shared data, notifications, and beta access stay tied to the correct angler.';

  const modeOptions =
    authStatus === 'password_reset_required'
      ? (['Reset Password'] as const)
      : (['Sign In', 'Create Account', 'Magic Link', 'Forgot Password'] as const);
  const selectedMode =
    authStatus === 'password_reset_required'
      ? 'Reset Password'
      : mode === 'sign_in'
        ? 'Sign In'
        : mode === 'sign_up'
          ? 'Create Account'
          : mode === 'magic_link'
            ? 'Magic Link'
            : 'Forgot Password';

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={layout.buildScrollContentStyle({ centered: true, gap: 14, bottomPadding: 40 })} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Account Sign-In"
          subtitle="Use your real beta account so sync, sharing, and recovery work correctly on this device."
          eyebrow="Secure Access"
        />
        <SectionCard title="Account Access" subtitle="Sign in to use the full shared beta experience, password recovery, and native account features.">
          <OptionChips
            label="Account Flow"
            options={modeOptions}
            value={selectedMode}
            onChange={(value) => {
              if (value === 'Sign In') setMode('sign_in');
              if (value === 'Create Account') setMode('sign_up');
              if (value === 'Magic Link') setMode('magic_link');
              if (value === 'Forgot Password') setMode('reset');
            }}
          />
          <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>{statusText}</Text>
          {!hasSupabaseConfig ? (
            <StatusBanner
              tone="warning"
              text={cloudFeaturesUnavailableMessage}
            />
          ) : null}
          {authStatus === 'pending_verification' ? <StatusBanner tone="info" text="The account flow is waiting on your email inbox. Finish that step, then return to the app." /> : null}
          {!hasSupabaseConfig ? <Text style={{ color: theme.colors.textSoft, lineHeight: 20 }}>This native beta build expects real Supabase configuration before account access, shared data, and sync can work.</Text> : null}

          {(mode === 'sign_up' || authStatus === 'password_reset_required') ? null : (
            <FormField label="Email">
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="angler@email.com"
                placeholderTextColor={theme.colors.inputPlaceholder}
                style={formInputStyle}
              />
            </FormField>
          )}

          {mode === 'sign_up' ? (
            <FormField label="Name">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={theme.colors.inputPlaceholder}
                style={formInputStyle}
              />
            </FormField>
          ) : null}

          {(mode === 'sign_in' || mode === 'sign_up' || authStatus === 'password_reset_required') ? (
            <>
              <FormField label={authStatus === 'password_reset_required' ? 'New Password' : 'Password'}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="At least 8 characters"
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  style={formInputStyle}
                />
              </FormField>
              {(mode === 'sign_up' || authStatus === 'password_reset_required') ? (
                <FormField label="Confirm Password">
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder="Repeat password"
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    style={formInputStyle}
                  />
                </FormField>
              ) : null}
            </>
          ) : (
            <FormField label="Email">
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="angler@email.com"
                placeholderTextColor={theme.colors.inputPlaceholder}
                style={formInputStyle}
              />
            </FormField>
          )}

          <AppButton
            label={
              authStatus === 'password_reset_required'
                ? 'Set New Password'
                : mode === 'sign_up'
                  ? 'Create Account'
                  : mode === 'sign_in'
                    ? 'Sign In'
                    : mode === 'magic_link'
                      ? 'Send Magic Link'
                      : 'Send Reset Link'
            }
            onPress={() => {
              submit().catch(console.error);
            }}
            disabled={isSubmitting}
          />
        </SectionCard>
      </ScrollView>
    </ScreenBackground>
  );
};
