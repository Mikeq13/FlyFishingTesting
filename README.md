# Fishing Lab

## Local Supabase Setup

Use a local, untracked `.env.local` file for Expo client configuration:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Important rules:

- Only put client-safe Expo variables in `.env.local`.
- Never put `SUPABASE_SERVICE_ROLE_KEY` or any admin/server secret in:
  - `.env.local`
  - `app.json`
  - source files
  - any `EXPO_PUBLIC_*` variable
- The Supabase anon key is expected to live in the client bundle. Security comes from Supabase Auth, strong RLS, and identity-backed ownership checks.

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
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
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
