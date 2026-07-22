## Why

Using index number emojis (`1️⃣`..`5️⃣`) on the second line of the 2-line dice display caused visual clutter and confusion because both dice faces and position indices rendered as blue square number icons (`[6]` above `[1]`). Replacing the unheld position index numbers with small square placeholder emojis (`▫️`) (Option 3) clearly distinguishes dice values from hold indicators.

## What Changes

- **2-Line Dice & Status Display with Dot Placeholders (Option 3)**:
  - Line 1: Space-separated dice face emojis (e.g. `:six: :three: :four: :one: :four:`).
  - Line 2: Corresponding hold status indicators directly below each die. Held dice display `🔒`, while unheld dice display small white square placeholder emojis (`▫️`).

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `game-orchestrator`: Update dice rendering format requirement to Option 3 (2-line layout with `🔒` for held dice and `▫️` for unheld dice).

## Impact

- `src/presentation/discord/adapter/serializer.ts`: Update `serializeGame` `Current Dice` formatting.
- `src/presentation/discord/adapter/adapter.test.ts` & `src/index.test.ts`: Update unit test assertions.
