# Live Regression Checklist

Use this checklist before calling a build "trusted" for beta testing. The goal is to confirm that live behavior still matches the app's promise after refresh, relaunch, and shared-data sync.

## Trust-Critical Flows

- Native beta cold start:
  Install the Android debug or preview build, cold-open it, confirm Home opens as a field cockpit, and confirm Settings / owner tools are not the first thing a normal tester has to understand.
- Active outing recovery:
  Start a practice outing, leave the app, relaunch, and confirm Home shows the current outing with a working resume action.
- Field cockpit launch:
  From Home, start Practice, Experiment, and Competition directly and confirm each route opens the matching setup or outing flow without requiring admin or owner context.
- Field action feedback:
  During practice, log a fish, add a note, change water, and change technique. Confirm the app gives clear saved/action feedback and the latest state survives refresh or relaunch.
- Multi-group sharing:
  Share one session to more than one group, refresh the app, and confirm each group still sees the shared session correctly.
- Practice water and technique changes:
  Start a practice session, change water, change technique, refresh, and confirm the active or most recent segment still reflects the expected water, depth, rig, and technique context.
- Experiment fresh-start protection:
  Start an experiment, log meaningful casts or catches, then change water or technique and confirm the app prompts the angler to save and start fresh instead of mixing contexts.
- Experiment context persistence:
  Save and start fresh after a water or technique change, refresh the app, and confirm the older experiment still shows its original water and technique while the new experiment shows the updated context.
- Experiment fly-lineup fork protection:
  Start an experiment, log meaningful casts, then change flies or rig count and confirm the app saves the current comparison and starts exactly one fresh draft instead of blending the old and new comparison into one record.
- Saved library idempotency:
  Save the same river, fly, leader formula, or rig preset more than once with casing or spacing variations and confirm the app keeps one canonical saved item.
- Clear Everything:
  Run `Clear Everything`, refresh, relaunch, and confirm fishing history, saved setups, groups, invites, and shares do not reappear for that angler.
- Shared-data cold open:
  Cold-open the app while signed in and confirm shared groups, invites, and insights surfaces show explicit loading, ready, or unavailable states instead of silently partial data.

## Shared Sync And Backend Messaging

- Temporary outage handling:
  If the beta backend is unavailable, confirm the app distinguishes `saved locally`, `syncing to shared backend`, and `shared backend temporarily unavailable` without implying lost changes.
- Structural mismatch handling:
  If a schema or policy issue is detected, confirm the app points toward a backend migration or policy fix instead of implying corrupted data.
- Cleanup sync status:
  Archive or delete a record, refresh, and confirm pending cleanup stays hidden while syncing and failed cleanup states are surfaced clearly.
- Post-refresh trust:
  If a change looked saved immediately, refresh or relaunch and confirm the same state is still present. Any mismatch between immediate and refreshed state should be treated as a trust bug.
- Duplicate-proof analytics:
  Reproduce a save, modify-and-continue, and save-and-start-fresh loop, then confirm History, Session Detail, and Insights do not show duplicate rivers, duplicate experiments, or inflated catch totals.
- Insight confidence language:
  Confirm each insight labels whether it is an early signal, moderate evidence, or a strong pattern, and that low-sample data does not read like a guaranteed recommendation.

## Mode-Specific UX

- Practice:
  Timer, water changes, active technique, and catch logging should stay easy to reach without scrolling back through setup.
- Experiment:
  Context, fly comparison, and result logging should stay readable and clearly comparison-focused, with direct comparison summaries staying separate from broad top-fly rankings.
- Competition:
  Assignment context, timer, and catch flow should remain lightweight and scorekeeping-first.

## Visual Consistency

- Theme pass:
  Review Session, Practice, Experiment, History, Insights, Coach, and foreground editors under each supported theme.
- Light-surface consistency:
  Confirm cards, filter lists, modals, and inline summaries use the same surface hierarchy and do not fall back to legacy static colors.

## Pre-Build Release Checks

- Canonical repo:
  Build only from `C:\dev\FlyFishingTesting` and confirm `git status` is clean before running EAS.
- Local verification bundle:
  Run `npm run verify:prebuild` and confirm typecheck, theme hardcoding, backend env checks, and legacy-key scanning all pass locally before starting EAS.
- Theme guardrail:
  Run `npm run check:theme-hardcoding` and confirm the only remaining raw color values live in `src/design/theme.ts`.
- Supabase schema verification:
  Run `supabase/verify_friend_beta_schema.sql` against the live project and confirm the normalized-name columns plus the duplicate-proofing indexes exist before tester builds.
- Publishable key path:
  Confirm local `.env.local` and any EAS build-time envs use `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, not the disabled legacy anon key.
- Backend diagnostics:
  Open Settings → Power Tools → Backend Diagnostics and confirm schema status is `compatible`, shared bootstrap is healthy, and failed sync items are either empty or understood before sending builds to testers.
- Preview build target:
  Use the `preview` profile for direct-install field testing unless TestFlight/App Store distribution is specifically needed.

## Android Hands-Free Beta

- Android package:
  Confirm the native project package and `app.json` Android package are both `com.fishinglab.app`.
- Assistant resources:
  Confirm `android/app/src/main/res/xml/shortcuts.xml` and `android/app/src/main/res/values/handsfree-assistant-arrays.xml` exist after prebuild.
- Deep link routing:
  Confirm the Android manifest includes a `fishinglab://hands-free` VIEW intent filter and `android.app.shortcuts` metadata.
- Supported commands:
  Validate only the beta vocabulary: resume current outing, log fish, add note, change water, and change technique.
- Disabled state:
  Turn off hands-free dictation and confirm voice/deep-link commands fail with the same in-app disabled message.
- No-active-outing state:
  Trigger a hands-free command with no active outing and confirm the app explains that no outing is available instead of silently doing nothing.
- Build verification:
  Run `npx.cmd expo prebuild --platform android --no-install` and `.\gradlew.bat :app:assembleDebug` from `android/` before sharing an Android APK.

## Tester Wave Gate

- Owner device pass:
  One full owner-device outing flow passes before inviting anyone else.
- Trusted angler pass:
  Two or three trusted anglers install the Android build and complete one short practice outing each.
- Friend beta pass:
  Expand to 8-12 testers only after cold open, active outing recovery, hands-free deep links, sync messaging, and duplicate-proof insights pass.

## Sign-Off Notes

- Build or commit tested:
- Date tested:
- Tester:
- Pass / follow-up items:

