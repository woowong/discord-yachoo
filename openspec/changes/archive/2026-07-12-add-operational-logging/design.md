## Context

Currently, the Cloudflare Worker handling Discord interactions ([src/index.ts](file:///Users/woowong/private/discord-yachoo/src/index.ts)) does not output service logs. Operational events like webhook verification, interaction parsing, D1 database records, and Discord API requests are processed silently. When errors occur, they are caught and sent directly back to the client, leaving no audit trails in the production logs.

We will introduce a structured logging system leveraging Effect.ts's native logging capabilities (`Effect.log`, `Effect.logInfo`, etc.) and log annotations (`Effect.annotateLogs`).

## Goals / Non-Goals

**Goals:**
- Provide real-time operational and audit logs for all Discord bot activities in production.
- Capture critical events: signature verification checks, JSON parsing, game initiations, turn executions, and match finalization.
- Automatically bind metadata (`userId`, `guildId`, `gameId`, `interactionId`, `commandName`/`customId`) to all logs emitted within an interaction handler's scope.
- Log unexpected exceptions at the Error level with error messages and stack traces.

**Non-Goals:**
- Logging inside the pure domain layer (`src/domain/`). Pure functions must remain clean and side-effect free.
- Integrating external logging SDKs (e.g., Datadog, Sentry) directly into the codebase. Cloudflare Workers will pipe stdout logs directly, allowing log shipping to be configured at the platform level (e.g., via Logpush).

## Decisions

### 1. Built-in Effect.ts Logging over Standard console.log
- **Rationale:** Using `Effect.logInfo`, `Effect.logWarning`, and `Effect.logError` matches the project's paradigm. They utilize the current context's configured Logger (which by default prints to the terminal console), and automatically inherit log annotations defined in the fiber context.
- **Alternatives Considered:** Standard `console.log` statements. However, `console.log` does not support fiber-scoped metadata annotations automatically, requiring manual string building or custom wrappers.

### 2. Contextual Metadata using `Effect.annotateLogs`
- **Rationale:** `Effect.annotateLogs(key, value)` dynamically injects key-value metadata into the current fiber context. Any log statements invoked nested within that scope automatically inherit and serialize the metadata (e.g., `[userId=...] [gameId=...]`).
- **Keys to Annotate:**
  - `interactionId` (from Discord request payload)
  - `userId` (the user triggering the interaction)
  - `guildId` (the Discord server where the interaction happened)
  - `gameId` (the active Yacht Game ID, if resolving/saving game state)
  - `actionType` (e.g., `command` or `component`)
  - `actionName` (e.g., slash command name or button custom ID)

### 3. Log Annotation propagation to Background Tasks (`ctx.waitUntil`)
- **Rationale:** For dice rolling animations or turn mentions, the worker schedules background operations via `ctx.waitUntil` using `Effect.runPromise`. Because these execute asynchronously, they must be annotated appropriately (either by passing the annotated effect or by applying annotations inside the background task generator).
- **Implementation:** The background pipelines running in `ctx.waitUntil` will wrap their execution with the same annotations extracted from the parent context.

## Risks / Trade-offs

- **[Risk] Log volume and cost in Cloudflare:** Deployed Cloudflare Workers log every console output. In high-traffic environments, logging every action could increase log storage/forwarding costs.
  - **Mitigation:** Focus logs on operational state transitions rather than verbose step-by-step debug logging. Ensure debug-level logs are only logged if the log level is configured as such.
- **[Risk] Context loss in async fibers:** Since `ctx.waitUntil` detaches from the request lifecycle, log annotations might be lost if run in an unannotated scope.
  - **Mitigation:** Explicitly apply `Effect.annotateLogs` on the background Effect task before calling `Effect.runPromise`.
