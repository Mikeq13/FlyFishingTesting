import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { RemoteSessionSnapshot } from '@/types/remote';
import { supabase } from './supabaseClient';

const redirectTo = Linking.createURL('access');

const toSnapshot = (session: Session | null): RemoteSessionSnapshot | null => {
  if (!session?.user) return null;
  return {
    authUserId: session.user.id,
    email: session.user.email ?? null,
    accessToken: session.access_token,
    emailVerifiedAt: session.user.email_confirmed_at ?? null
  };
};

const parseFragment = (url: string): Record<string, string> => {
  const hash = url.split('#')[1] ?? '';
  return Object.fromEntries(Array.from(new URLSearchParams(hash).entries()));
};

export const getRedirectUrl = () => redirectTo;

export const bootstrapAuthSession = async (): Promise<RemoteSessionSnapshot | null> => {
  const { data } = await supabase.auth.getSession();
  return toSnapshot(data.session);
};

export const signInWithMagicLink = async (email: string): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo: redirectTo
    }
  });
  if (error) throw error;
};

export const signUpWithPassword = async ({
  email,
  password,
  name
}: {
  email: string;
  password: string;
  name: string;
}): Promise<{ session: RemoteSessionSnapshot | null }> => {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Name is required.');
  }
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }
  if (password.trim().length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        name: trimmedName
      }
    }
  });
  if (error) throw error;
  return { session: toSnapshot(data.session) };
};

export const signInWithPassword = async ({
  email,
  password
}: {
  email: string;
  password: string;
}): Promise<RemoteSessionSnapshot> => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }
  if (!password.trim()) {
    throw new Error('Password is required.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });
  if (error) throw error;
  const snapshot = toSnapshot(data.session);
  if (!snapshot) {
    throw new Error('Sign-in did not return an active session.');
  }
  return snapshot;
};

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo
  });
  if (error) throw error;
};

export const updatePassword = async (password: string): Promise<void> => {
  if (password.trim().length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  const { error } = await supabase.auth.updateUser({
    password
  });
  if (error) throw error;
};

export const updateAccountEmail = async (email: string): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }
  const { error } = await supabase.auth.updateUser({
    email: normalizedEmail
  });
  if (error) throw error;
};

export const updateAccountMetadata = async (name: string): Promise<void> => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Name is required.');
  }
  const { error } = await supabase.auth.updateUser({
    data: {
      name: trimmedName
    }
  });
  if (error) throw error;
};

export const getMfaAssuranceLevel = async () => {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data;
};

export const listMfaFactors = async () => {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data;
};

export const enrollTotpFactor = async (friendlyName: string) => {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: friendlyName.trim() || 'Fishing Lab Authenticator'
  });
  if (error) throw error;
  return data;
};

export const verifyTotpFactor = async ({
  factorId,
  code
}: {
  factorId: string;
  code: string;
}) => {
  const challenge = await supabase.auth.mfa.challenge({
    factorId
  });
  if (challenge.error) throw challenge.error;
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: code.trim()
  });
  if (error) throw error;
  return data;
};

export const unenrollMfaFactor = async (factorId: string): Promise<void> => {
  const { error } = await supabase.auth.mfa.unenroll({
    factorId
  });
  if (error) throw error;
};

export const signOutRemote = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const consumeAuthRedirect = async (url: string): Promise<RemoteSessionSnapshot | null> => {
  const parsed = Linking.parse(url);
  const queryParams = parsed.queryParams ?? {};
  if (typeof queryParams.code === 'string' && queryParams.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(queryParams.code);
    if (error) throw error;
    return toSnapshot(data.session);
  }

  const fragment = parseFragment(url);
  if (fragment.access_token && fragment.refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: fragment.access_token,
      refresh_token: fragment.refresh_token
    });
    if (error) throw error;
    return toSnapshot(data.session);
  }

  return bootstrapAuthSession();
};

export const subscribeToAuthChanges = (
  onChange: (snapshot: RemoteSessionSnapshot | null, event: string) => void
): (() => void) => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    onChange(toSnapshot(session), event);
  });
  return () => {
    data.subscription.unsubscribe();
  };
};
