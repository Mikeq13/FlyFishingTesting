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
    accessToken: session.access_token
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
  onChange: (snapshot: RemoteSessionSnapshot | null) => void
): (() => void) => {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(toSnapshot(session));
  });
  return () => {
    data.subscription.unsubscribe();
  };
};
