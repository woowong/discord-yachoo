## Why

Currently, solo and multiplayer game statistics (wins, losses, draws, and highest score) are mixed under a single set of columns in the players table. This prevents users from tracking their personal best solo records separately from their multiplayer match records, and makes the leaderboard less meaningful as matching wins and solo games are not distinguished.

## What Changes

- **Schema Update**: Update `players` table schema to separate statistics into Solo Mode and Multiplayer (Matching) Mode.
- **Repository Interface**:
  - Update `PlayerRepository` to store/retrieve both Solo and Multiplayer stats.
  - Update `updateStats` function (or split it) to accept a `mode` parameter so it knows whether to update solo or multi statistics.
- **Presenter & Commands**:
  - Update `/profile` command response to show separate sections for Solo Mode stats (games played, highest score) and Matching Mode stats (wins, losses, draws, highest score).
  - Update `/leaderboard` command to support an optional `type` option (`solo` or `multi`). If not specified, default to matching mode.

## Capabilities

### New Capabilities

*(None)*

### Modified Capabilities

- `d1-database-schema`: Add new columns to `players` table to track solo play count, solo highest score, multiplayer wins, multiplayer losses, multiplayer draws, and multiplayer highest score. Support migrating existing records to the new columns or setting them to safe initial values.
- `persistence-repository`: Update `PlayerRepository` interface and its D1 implementation to support retrieving and updating separate solo and multiplayer stats. Specifically, `updateStats` needs to distinguish mode, and `getLeaderboard` should support querying either the solo leaderboard (by solo highest score) or matching leaderboard (by matching wins).

## Impact

- **Database**: Cloudflare D1 migrations needed.
- **Codebase**:
  - `src/persistence/repository.ts`
  - `src/persistence/d1/repository.ts`
  - `src/index.ts` (command handlers and game end handlers)
  - `src/presentation/discord/adapter/serializer.ts`
  - `scripts/register-commands.ts`
- **Tests**: Update repository tests and integration tests to verify the separated stats behavior.
