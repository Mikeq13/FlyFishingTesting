# Vercel Demo Script

Use this script when reviewing the web build or submitting the project for judging. It keeps the demo focused on the app's strongest promise: fast field logging that becomes useful insight.

## One-Minute Core Demo

- Open the Vercel web app and confirm Home shows a journal-first welcome.
- Click `Start Journal Entry`.
- Choose a fishing style and complete the lightweight setup.
- Start the journal and confirm the field screen opens without owner/admin context.
- Log one catch and confirm it appears in `Recent Catches`.
- Change water and confirm the journal remains active.
- Open `Voice Commands` and confirm the command help scrolls to the `Done` button.

## Fly Fishing Depth Demo

- Start a fly-fishing experiment journal.
- Open the Experiment screen and confirm the compact cockpit shows `Testing`, `Water`, `Technique`, and `Result`.
- Open `Experiment Setup` and confirm `Testing Variable`, `Baseline Fly`, `Cast Step`, and `Hypothesis` are grouped together.
- Open `Change Technique` and confirm leader and rigging context are reachable from the same sheet.
- Log casts or catches and confirm the comparison summary remains visible near the top.

## Non-Fly Value Demo

- Start a spinning or bait journal.
- Log a catch with no fly selected and confirm the app does not crash.
- Confirm `Tackle Signal` updates after the catch.
- Start a boat or trolling journal.
- Log a catch and confirm `Boat Signal` updates after the catch.

## Web Readiness Checks

- Refresh the browser after logging a catch and confirm the journal data still appears.
- Confirm backend errors read as local-save or sync-retry states instead of lost data.
- Confirm direct refresh on a nested route returns to the app shell instead of a blank page.
- Confirm default, high contrast, and daylight themes keep text readable on cards, chips, banners, and modals.

## Current Beta Limitations

- The web build is intended as a strong product demo and local-first journal preview.
- Native device validation is still required for notification behavior, app links, and hands-free platform integrations.
- Shared backend trust depends on the live Supabase schema verification query passing before tester rollout.
