## Why

When a Yacht Dice game is finished on Discord, the interaction components (buttons and selection dropdown) are not cleared from the message. This allows players to attempt actions like rolling dice on a finished game, resulting in an unreadable `Error: [object Object]` response due to custom error classes not extending the standard JavaScript `Error` class.

## What Changes

- Update `serializeGame` in Discord response serializer to return an empty `components` array instead of `undefined` when the game is finished, which signals Discord to clear all buttons and dropdowns from the UI.
- Gracefully handle `GameAlreadyOverError` during roll and category selection interactions by catching the error and returning the current finished game state, forcing Discord to refresh and clear stale components.
- Modify custom domain error classes (`GameAlreadyOverError`, `RollLimitExceededError`, `CategoryAlreadyFilledError`, `InvalidStateActionError`, `NotYourTurnError`) to extend the standard JavaScript `Error` class and call `super()` with descriptive messages.
- Add test coverage for both components clearing on finished games, error recovery UI refresh, and proper error formatting.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None

## Impact

- `src/presentation/discord/adapter/serializer.ts` (Discord response presentation logic)
- `src/domain/errors.ts` (Domain custom error definitions)
- `src/presentation/discord/adapter/adapter.test.ts` (Serializer testing)
- `src/index.test.ts` (Integration testing)
