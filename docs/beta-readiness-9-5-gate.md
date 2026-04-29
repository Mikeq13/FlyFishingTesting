# 9.5 Beta Readiness Gate

This gate defines what "ready enough to submit and cut new beta builds" means for Fishing Lab. It is intentionally practical: pass the trust-critical flows, keep the field UI coherent, and avoid framework churn unless it removes a real beta risk.

## Tamagui Foundation

- Keep `ThemeProvider` as the product theme source of truth.
- Keep Tamagui themes generated from `src/design/theme.ts` through `src/design/tamagui.config.ts`.
- Use shared primitives for buttons, cards, banners, form fields, modal surfaces, bottom sheets, chips, and inline summaries.
- Keep native primitives where they protect expected behavior: `ScrollView`, `Pressable`, `Modal`, and `TextInput`.
- Review Home, Session, Practice, Experiment, History, Insights, Coach, and Access under `default_professional`, `high_contrast`, and `daylight_light`.

## Trust-Critical Flow Gate

- Home clearly offers `Start Journal Entry` or resume for an active journal.
- Active outing survives refresh or relaunch.
- Practice can log a catch, add a note, change water, and change technique without losing the entry.
- Experiment can resume, log casts/catches, change water or technique with fresh-context protection, and keep draft saves.
- Spinning and boating catch logs work without fly names or fly snapshots.
- Sync failures show saved-local or retry messaging instead of crashing the field flow.
- Double taps on save actions do not create duplicate records.

## Vercel Submission Gate

- `npm run verify:submission` passes locally.
- Vercel uses `npm run build:web` and `dist` as the output directory.
- First load, refresh, and nested-route refresh return to the app shell.
- Local storage persistence works for a complete journal entry.
- The demo script in `docs/vercel-demo-script.md` can be completed without browser zoom changes.
- The non-fly smoke checklist in `docs/non-fly-beta-smoke-checklist.md` passes for spinning and boating.

## EAS Preview Build Gate

- Run `npm run verify:prebuild`.
- Run `npm run build:web`.
- Run `supabase/verify_friend_beta_schema.sql` against the live Supabase project.
- Build Android preview with `npx eas build --platform android --profile preview`.
- Build iOS preview with `npx eas build --platform ios --profile preview` when Apple credentials are ready.
- Complete one owner-device pass before inviting testers:
  - One fly practice journal.
  - One experiment resume and save.
  - One spinning catch log.
  - One boating catch log.
  - One Voice Commands or hands-free check.

## Sign-Off Bar

- No known crash in start, resume, log catch, change water, change technique, save experiment, or refresh.
- Home communicates the core journal action within one minute.
- Fly fishing feels deep and intentional.
- Spinning and boating feel intentionally supported, not bolted on.
- Advanced diagnostics live in Access/Settings and do not crowd the normal field path.
