## Context

Currently, the Discord Yacht bot uses Cloudflare Workers and a Cloudflare D1 database. The database records player stats globally in the `players` table (indexed by the unique Discord User ID) and match details in the `matches` table. When the bot is invited to multiple servers (e.g. a personal development server and a public community server), the stats and game histories are merged. This design addresses how to isolate these records by Discord Guild (Server) using the `guild_id` supplied in Discord's interaction payload.

## Goals / Non-Goals

**Goals:**
- Isolate `/profile` statistics, `/leaderboard` rankings, and `/history` match logs by Discord Guild (server).
- Preserve existing user records for global user display names.
- Support Direct Message (DM) interactions by treating them as a fallback (null/empty guild ID).

**Non-Goals:**
- We will not migrate existing aggregated legacy player stats into individual guild records. Existing global stats will remain in the `players` table as a legacy global profile.
- We will not implement cross-server global leaderboards for now.

## Decisions

### 1. Per-Guild Stats Storage Strategy
- **Option A (Chosen):** Retain the `players` table as a global directory of player usernames and register a new table `guild_player_stats` keyed by `(player_id, guild_id)`.
  - *Rationale:* Modifying the primary key of the SQLite `players` table requires copying all records into a temporary table, dropping the table, and recreating it. Introducing a separate `guild_player_stats` table avoids this risky D1 schema alteration, keeps legacy global stats intact, and makes it trivial to query either global or server-specific stats.
- **Option B:** Recreate the `players` table with a composite primary key `(id, guild_id)`.
  - *Rationale:* Rejected due to complexity in SQLite schema migrations and risk of breaking existing queries.

### 2. Match Table Guild Scoping
- **Decision:** Add a nullable `guild_id TEXT` column to the `matches` table.
- **Query Strategy:**
  - When querying `/history` from a guild channel, fetch matches matching `guild_id = ?`.
  - When querying `/history` from a DM, fetch matches where `guild_id IS NULL`.

### 3. Repository Interface Adaptation
- **Decision:** Update the parameters of `PlayerRepository` and `MatchRepository` methods:
  - `getPlayer(id: string, guildId?: string | null)`
  - `updateStats(id: string, guildId: string | null, mode: 'single' | 'multi', outcome: 'win' | 'loss' | 'draw', score: number)`
  - `getLeaderboard(mode: 'single' | 'multi', guildId: string | null, limit: number)`
  - `getRecentMatches(playerId: string, guildId: string | null, limit: number)`
- In both D1 and Memory implementations, if `guildId` is null/undefined, operations will target the global scope (e.g., global player profile or DM stats).

### 4. Database Cleanup Strategy
- **Decision:** Option 1 (Clean Slate - All-clear / Reset) is chosen.
- **Implementation:** The SQL migration script `migrations/0005_guild_scoped_stats.sql` will include `DELETE` queries to truncate all existing records from the `matches`, `active_games`, and `players` tables. This guarantees that no mixed/corrupt test data contaminates the database.

## Risks / Trade-offs

- **[Risk] Match history compatibility:** Existing match records do not have a `guild_id`. Running `/history` in a guild won't show these legacy matches.
  - *Mitigation:* This is expected behavior. Legacy matches will only be shown if `/history` is run in DMs or if we explicitly fallback to displaying null-guild matches in history lists (we choose to exclude legacy global matches from guild-specific history to ensure complete isolation).
- **[Risk] Extra writes during game finish:** Saving game stats will require writing to both the global `players` table (for backwards compatibility/global registry) and the `guild_player_stats` table.
  - *Mitigation:* Cloudflare D1 operations are executed within Workers. Using batch queries or a single D1 transaction ensures that writing to both tables remains fast and consistent.
