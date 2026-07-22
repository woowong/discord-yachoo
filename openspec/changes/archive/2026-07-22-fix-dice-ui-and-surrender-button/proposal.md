## Why

During dice rolling animations, the surrender button label changes from being icon-only (`🏳️`) in normal turn state to displaying text (`기권 (Surrender)`) in the rolling state. This inconsistency causes a sudden button width pop and layout distortion during dice rolling. Additionally, current dice values are rendered vertically across 5 separate lines, consuming unnecessary vertical screen space in Discord embed messages.

## What Changes

- **Surrender Button Uniformity**: Standardize the surrender button label to be icon-only (`🏳️`) across both normal turn rendering and disabled rolling animation rendering, eliminating layout shift.
- **Horizontal Dice Layout (Option A)**: Reformat the `Current Dice` section in game embeds into a single horizontal line using dice face emojis and lock (`🔒`) icons appended for held dice (e.g. `Current Dice: ⚅ ⚂🔒 ⚃ ⚁🔒 ⚃`).

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `game-orchestrator`: Update Discord presentation requirements for uniform surrender button rendering in all states and horizontal single-line dice rendering with lock icons.

## Impact

- `src/presentation/discord/adapter/serializer.ts`: Update `serializeGame` and `serializeRolling` methods.
- `src/presentation/discord/adapter/adapter.test.ts`: Update unit tests asserting dice display format.
