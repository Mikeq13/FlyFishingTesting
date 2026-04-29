# Non-Fly Beta Smoke Checklist

Use this checklist before widening beta access for spinning tackle and boating journals. The goal is to confirm regular fishing stays simple, local-first, and useful without fly-specific experiment controls.

## Spinning / Bait Journal

- Start from Home with `Start Journal Entry`.
- Choose a spinning or bait style and complete the lightweight setup.
- Start the journal and confirm `Tackle Setup`, `Tackle Signal`, `Log Catches`, and `Recent Catches` are visible.
- Tap `Log Catch`, choose a species, and save.
- Confirm the app does not crash and the catch appears in `Recent Catches`.
- Confirm `Tackle Signal` updates `Catches This Entry`, `Current Method`, and `Best Early Species`.
- Repeat with measurement enabled and confirm length is optional.
- Open `Log Catch`, then cancel. Confirm no catch is added.
- Double tap `Save Catch` quickly and confirm only one catch is added.
- Refresh or relaunch the web preview and confirm the logged catch persists.
- If signed in, confirm sync feedback says the catch is saved locally while backend sync is pending or unavailable.

## Boat / Trolling Journal

- Start from Home with `Start Journal Entry`.
- Choose a boating or trolling style and complete the lightweight setup.
- Start the journal and confirm `Boat Signal`, `Log Catches`, and `Recent Catches` are visible.
- Tap `Log Catch`, choose a species, and save.
- Confirm the app does not crash and the catch appears in `Recent Catches`.
- Confirm `Boat Signal` updates `Catches This Entry`, `Current Method`, and `Best Early Species`.
- Change water during the active entry and confirm logging remains available afterward.
- Repeat with measurement disabled and confirm the catch still saves.
- Refresh or relaunch the web preview and confirm the logged catch persists.
- If signed in, confirm failed parent sync dependencies show as local-save retry states, not a screen crash.

## Acceptance Bar

- Non-fly catch logging never exits the active journal unexpectedly.
- A catch with no fly name or fly snapshot is treated as valid for spinning and boating.
- The angler always sees either a saved confirmation or a recoverable warning.
- Tackle and boat signals provide value after the first catch.
