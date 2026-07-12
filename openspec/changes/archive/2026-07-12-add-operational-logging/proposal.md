## Why

Currently, the Discord Yachoo bot does not log critical operational events in production. To monitor the application, debug issues, and audit game activities (e.g., matching, playing turns, errors), we need a structured operational logging system that records key lifecycle events along with rich contextual metadata (like user ID, guild ID, game ID).

## What Changes

- Add structured logs using `Effect.logInfo`, `Effect.logWarning`, and `Effect.logError` throughout the request processing and interaction handling lifecycle.
- Apply `Effect.annotateLogs` to attach contextual metadata (`userId`, `guildId`, `gameId`, `interactionId`, `commandName`) to all logs generated within an interaction handler's scope.
- Log critical game events: match initializations, dice rolling actions, categories selection, game completions, and game result records.
- Log signature verification warnings (401 Unauthorized) and parsing errors (400 Bad Request) to facilitate webhook setup troubleshooting.

## Capabilities

### New Capabilities
- `operational-logging`: Set up structured logging and context annotations with Effect.ts logs to enable comprehensive audit trailing in production.

### Modified Capabilities
<!-- No modified requirements for existing capabilities -->

## Impact

- **Affected Code:** `src/index.ts` (the request entry point and handler).
- **Tooling:** Developer feedback from `wrangler tail` and `wrangler dev` will now show formatted, structured logs.
- **Dependencies:** None (uses built-in Effect.ts logging).
- **DB/External APIs:** No changes to D1 schemas or Discord API integration.
