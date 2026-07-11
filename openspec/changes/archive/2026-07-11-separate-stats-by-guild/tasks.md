## 1. Database Migrations

- [x] 1.1 Create migration file `migrations/0005_guild_scoped_stats.sql` to add `guild_id` to `matches`, create `guild_player_stats` table, and clear existing records from `matches`, `active_games`, and `players` tables
- [x] 1.2 Run wrangler or D1 dry-run to ensure migration syntax is correct

## 2. Discord Interaction Parser Updates

- [x] 2.1 Update `ParsedInteraction` in `src/presentation/discord/adapter/types.ts` to include optional `guildId` field
- [x] 2.2 Update `parse` function in `src/presentation/discord/adapter/parser.ts` to read `guild_id` from the root of raw interaction JSON and attach it to command and component actions

## 3. Repository Interfaces and Memory Implementation

- [x] 3.1 Update interface signatures in `src/persistence/repository.ts` to accept `guildId?: string | null` for `getPlayer`, `updateStats`, `getLeaderboard`, and `getRecentMatches`
- [x] 3.2 Update memory implementation `src/persistence/memory/repository.ts` or add guild support if required (for compatibility)

## 4. D1 Repository Implementation

- [x] 4.1 Update `D1PlayerRepositoryLive` in `src/persistence/d1/repository.ts` to support guild-specific operations (querying and inserting into `guild_player_stats` table)
- [x] 4.2 Update `D1MatchRepositoryLive` in `src/persistence/d1/repository.ts` to filter and save match records by `guild_id`

## 5. Game Orchestrator and Command Handlers

- [x] 5.1 Update `/profile` command handler in `src/index.ts` to extract `guildId` from the interaction and pass it to `getPlayer`
- [x] 5.2 Update `/leaderboard` command handler in `src/index.ts` to extract `guildId` and pass it to `getLeaderboard`
- [x] 5.3 Update `/history` and related paging component handlers in `src/index.ts` to extract `guildId` and pass it to `getRecentMatches`
- [x] 5.4 Update game complete handler under `select_category` interaction in `src/index.ts` to pass `guildId` to `saveMatch` and `updateStats`

## 6. Verification and Testing

- [x] 6.1 Update database tests in `src/persistence/d1.test.ts` to verify guild-scoped behaviors
- [x] 6.2 Update integration tests in `src/index.test.ts` to check if `guildId` flows correctly from request to response
- [x] 6.3 Run tests using `npm run test` or `vitest` to ensure no regressions
