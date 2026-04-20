import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);
export const missingSupabaseConfigMessage =
  'Supabase is not configured on this device yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your local .env.local file, then restart Expo with -c.';
export const cloudFeaturesUnavailableMessage =
  'Cloud account features are unavailable on this device until EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set in .env.local and Expo is restarted with -c.';

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn('Supabase env vars are missing. Shared beta sync will stay disabled until EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set.');
}

export const supabase = createClient(supabaseUrl ?? 'https://missing-project.supabase.co', supabasePublishableKey ?? 'missing-key', {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web'
  }
});
