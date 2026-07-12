## 1. Request Lifecycle Logging

- [x] 1.1 Add signature verification failure warning logging in `src/index.ts`.
- [x] 1.2 Add interaction parsing and JSON validation failure warning logging in `src/index.ts`.
- [x] 1.3 Add unhandled exception error logging in the global `Effect.catchAll` of `src/index.ts`.

## 2. Log Annotation setup

- [x] 2.1 Extract interaction metadata (`userId`, `guildId`, `gameId`, `interactionId`, `actionType`, `actionName`) from the parsed interaction payload.
- [x] 2.2 Apply `Effect.annotateLogs` to wrap the `handleInteraction` flow with the extracted metadata.
- [x] 2.3 Propagate log annotations to background asynchronous effects running inside `ctx.waitUntil`.

## 3. Audit Logging for Game Events

- [x] 3.1 Log match initializations (the `/challenge` command flow) showing game mode and participant IDs.
- [x] 3.2 Log dice holding events (the `hold_` button actions) indicating the user and current hold state.
- [x] 3.3 Log dice rolling events (the `roll_` button actions) indicating roll counts and outcomes.
- [x] 3.4 Log category selections (the `select_category` select-menu action) indicating selected category and points.
- [x] 3.5 Log match records preservation to database and stats update events on game finalization.

## 4. Verification & Testing

- [x] 4.1 Run unit tests using `npm run test` to verify no regressions in domain logic.
- [x] 4.2 Run the local CLI simulator using `npm run simulate` to verify normal game loops.
- [x] 4.3 Start the wrangler local dev server and trigger mock requests to verify that logs show up with proper annotations and formatting.
