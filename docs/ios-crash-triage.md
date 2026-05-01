# iOS Crash Triage Note

Use this note for the current Codex submission window. The web demo is the primary review target while the iOS EAS startup crash is being isolated.

## Current Position

- iOS builds install, then close immediately on launch.
- The failure happens before the app can be used, so treat it as a native startup crash until device logs prove otherwise.
- Do not block the Vercel/Codex review path on this issue. The web build is the stable product demo for tomorrow's grading window.

## Fast Triage Checklist

- Capture device logs from the installed build and identify whether the crash occurs before the React Native app shell renders.
- Check native module compatibility first: Expo SDK, React Native, SQLite/storage, Tamagui/native config, and any generated native plugin changes.
- Confirm the build includes client-safe env only: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Confirm missing backend configuration cannot crash startup. It should disable shared sync and keep local-first logging available.
- Rebuild only after the web submission path passes `npm run verify:prebuild` and `npm run build:web`.

## Submission Guidance

- Share the Vercel link as the polished grading surface.
- Note that native iOS is under startup-crash triage if asked.
- Continue using Android or web for functional flow review until the iOS launch log identifies the failing native dependency or startup path.
