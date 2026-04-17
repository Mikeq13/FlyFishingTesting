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
