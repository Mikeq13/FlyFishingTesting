# Live Regression Checklist

Use this checklist before calling a build "trusted" for beta testing. The goal is to confirm that live behavior still matches the app's promise after refresh, relaunch, and shared-data sync.

## Trust-Critical Flows

- Multi-group sharing:
  Share one session to more than one group, refresh the app, and confirm each group still sees the shared session correctly.
- Practice water and technique changes:
  Start a practice session, change water, change technique, refresh, and confirm the active or most recent segment still reflects the expected water, depth, rig, and technique context.
- Experiment fresh-start protection:
  Start an experiment, log meaningful casts or catches, then change water or technique and confirm the app prompts the angler to save and start fresh instead of mixing contexts.
- Clear Everything:
  Run `Clear Everything`, refresh, relaunch, and confirm fishing history, saved setups, groups, invites, and shares do not reappear for that angler.
- Shared-data cold open:
  Cold-open the app while signed in and confirm shared groups, invites, and insights surfaces show explicit loading, ready, or unavailable states instead of silently partial data.

## Shared Sync And Backend Messaging

- Temporary outage handling:
  If the beta backend is unavailable, confirm the app describes it as a temporary service issue and makes it clear that local data is still safe.
- Structural mismatch handling:
  If a schema or policy issue is detected, confirm the app points toward a backend migration or policy fix instead of implying corrupted data.
- Cleanup sync status:
  Archive or delete a record, refresh, and confirm pending cleanup stays hidden while syncing and failed cleanup states are surfaced clearly.

## Mode-Specific UX

- Practice:
  Timer, water changes, active technique, and catch logging should stay easy to reach without scrolling back through setup.
- Experiment:
  Context, fly comparison, and result logging should stay readable and clearly comparison-focused.
- Competition:
  Assignment context, timer, and catch flow should remain lightweight and scorekeeping-first.

## Visual Consistency

- Theme pass:
  Review Session, Practice, Experiment, History, Insights, Coach, and foreground editors under each supported theme.
- Light-surface consistency:
  Confirm cards, filter lists, modals, and inline summaries use the same surface hierarchy and do not fall back to legacy static colors.

## Sign-Off Notes

- Build or commit tested:
- Date tested:
- Tester:
- Pass / follow-up items:
