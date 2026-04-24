# Fishing Lab Watch Companion Template

This folder contains the watchOS companion scaffolding for Fishing Lab.

It is intentionally kept outside the Expo module pod sources because this repo does not yet have a checked-in native `ios/` project with a watch target. After running `expo prebuild` or opening the generated native project in Xcode, add these files to a new watchOS app target and wire them to the existing phone-side `FishingLabWatchSyncManager`.

The watch companion is designed to:

- show the current active outing summary
- send `resume_outing`
- send `log_fish`
- send `add_note`
- send `change_water`
- send `change_technique`

All commands should be forwarded back to the phone through Watch Connectivity so the existing JS hands-free executor remains the single write path.
