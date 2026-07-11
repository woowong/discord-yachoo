## Why

Currently, player profiles, leaderboard rankings, and match histories are aggregated globally across all Discord servers. This means game results from a test/development server contaminate the stats and history displayed in production/community servers. This change isolates player statistics, leaderboards, and match history per Discord guild (server).

## What Changes

- **Update Interaction Parsing**: Parse the `guild_id` from Discord's interaction payload (both for slash commands and interactive components).
- **Match Table Modification**: Add `guild_id` column to the `matches` table to track the guild where a game was completed. Direct messages (DMs) will store `NULL` or a fallback identifier.
- **Guild-Specific Stats Table**: Create a new `guild_player_stats` table to track wins, losses, draws, and high scores per guild (primary key `(player_id, guild_id)`).
- **Update Repository interfaces**: Update `PlayerRepository` and `MatchRepository` methods to accept `guildId?: string | null` where relevant.
- **Isolate Command Output**: Filter `/profile`, `/leaderboard`, and `/history` based on the guild context in which they are invoked.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `d1-database-schema`: Needs schema updates for `matches` (add `guild_id`) and a new `guild_player_stats` table.
- `persistence-repository`: Update interfaces to accept `guildId` parameters for fetching, updating, and querying leaderboards and history.
- `discord-interaction-parser`: Parse the root-level `guild_id` field from raw interaction payloads.
- `game-orchestrator`: Connect interaction `guildId` to repository query and save operations.

## Impact

- **Database**: D1 migration files must be added. Existing matches will have `guild_id` set to `NULL` (representing legacy global or DM matches).
- **Codebase**: Repository implementations (D1 and Memory) and Discord response serializer/presenter code must be updated to handle guild context.
- **Testing**: Test cases for `d1.test.ts` and `index.test.ts` must be updated to verify server-scoped behavior.
