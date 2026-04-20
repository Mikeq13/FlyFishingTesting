# Fishing Lab

## Local Supabase Setup

Use a local, untracked `.env.local` file for Expo client configuration:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Important rules:

- Only put client-safe Expo variables in `.env.local`.
- Never put `SUPABASE_SERVICE_ROLE_KEY` or any admin/server secret in:
  - `.env.local`
  - `app.json`
  - source files
  - any `EXPO_PUBLIC_*` variable
- The Supabase publishable key is expected to live in the client bundle. Security comes from Supabase Auth, strong RLS, and identity-backed ownership checks.
- After all clients are switched to the publishable key, keep the legacy `anon` key disabled.

After changing `.env.local`, restart Expo with cache clear:

```bash
npx expo start -c --go
```

or for web:

```bash
npx expo start -c --web
```

Use a separate Supabase project for development when possible, and avoid testing owner/admin flows against production data.

## Native Beta Checklist

This project is configured for real native-device validation first:

- iPhone device build for your own testing
- internal preview builds for small tester waves
- Android APK output for direct native install while you prepare Play testing

### Required local env

Before running native auth, sync, magic link, or shared-data tests, set real values in `.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Then restart Expo with cache clear:

```bash
npx expo start -c --go
```

### Native device builds

Use these when validating auth screens, owner access, notifications, and shared data on real devices:

```bash
npx eas build --platform ios --profile development
npx eas build --platform android --profile development
```

### Apple login troubleshooting for `eas build`

If `eas build --platform ios --profile development` exits when you try to sign in to Apple Developer:

1. Use your normal Apple ID email and password for the Apple Developer account.
   Do not use an app-specific password for the iOS build-signing login step.
2. Make sure the Apple account has permission to manage certificates, identifiers, and provisioning profiles.
   On personal accounts this is typically the Account Holder. On organization accounts this is typically Account Holder or Admin.
3. If your Apple Developer account is federated through enterprise SSO, EAS CLI may not be able to use it for credential updates.
4. Run credentials management before retrying the build:

```bash
npx eas credentials --platform ios
```

5. If credentials already exist on EAS, reuse the Expo-managed remote credentials and then retry the build:

```bash
npx eas build --platform ios --profile development
```

This project is configured with `"credentialsSource": "remote"` in `eas.json` so EAS will prefer Expo-managed credentials instead of expecting local `credentials.json` files.

### Internal beta/tester builds

Use these after your own device validation passes:

```bash
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview
```

### What to validate on device

- sign in / create account / password reset
- magic link returns to the app using the `fishinglab://` scheme
- owner account visibility and owner-only tools
- reminder permission prompt and reminder scheduling
- shared data sync and queued changes after reconnect/foreground

### Assumption used in config

This repo now assumes these native app identifiers:

- iOS bundle identifier: `com.fishinglab.app`
- Android package: `com.fishinglab.app`

If you already reserved different production identifiers in Apple Developer or Play Console, update `app.json` before publishing tester builds.

## Supabase Schema Apply

This app expects the friend-beta remote schema in:

```text
supabase/friend_beta_schema.sql
```

If the app logs errors like:

```text
PGRST205: Could not find the table 'public.profiles' in the schema cache
```

your active Supabase project does not have the required schema yet.

If the app logs errors like:

```text
42P17: infinite recursion detected in policy for relation "group_memberships"
```

the schema exists, but one or more row-level security policies were applied with recursive membership checks. Re-run the updated `supabase/friend_beta_schema.sql` so the helper-function-based policies replace the recursive ones.

### Before you apply it

1. Confirm `.env.local` points to the intended Supabase project.
2. Open that same project in the Supabase dashboard.
3. Go to `SQL Editor`.
4. Run a quick check first:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'groups',
    'group_memberships',
    'share_preferences',
    'invites',
    'sponsored_access',
    'competitions',
    'competition_groups',
    'competition_sessions',
    'competition_participants',
    'competition_session_assignments',
    'sessions',
    'session_segments',
    'catch_events',
    'experiments',
    'saved_flies',
    'saved_leader_formulas',
    'saved_rig_presets',
    'saved_rivers'
  )
order by table_name;
```

If `profiles` is missing, apply the repo schema.

### Apply the repo schema

1. Open [supabase/friend_beta_schema.sql](C:\Users\13jmm\OneDrive\Documents\GitHub\FlyFishingTesting\supabase\friend_beta_schema.sql).
2. Copy the full file into the Supabase `SQL Editor`.
3. Run it against the same project used by `.env.local`.
4. Re-run the verification query above and confirm `profiles` and the related tables now exist.
5. If you previously applied an older copy of the schema, run the updated file again so the policy drops/recreates replace the recursive RLS rules too.

### Verify helper functions and policies

After reapplying the schema, open:

- [verify_friend_beta_schema.sql](C:\Users\13jmm\OneDrive\Documents\GitHub\FlyFishingTesting\supabase\verify_friend_beta_schema.sql)
- [diagnose_live_rls.sql](C:\Users\13jmm\OneDrive\Documents\GitHub\FlyFishingTesting\supabase\diagnose_live_rls.sql)

Run that query file in Supabase SQL Editor and confirm:

- helper functions like `is_group_member` exist
- `pg_policies` shows the recreated policies
- the final query returns no recursive `group_memberships` policy body references
- `group_memberships` is not using forced RLS and the helper functions show `is_security_definer = true`

### After schema apply

Restart the native dev-client bundler:

```bash
npx expo start --dev-client -c
```

Then reopen the installed development build and sign in again. The repeated `public.profiles` errors should stop once the schema is live in the active project.
