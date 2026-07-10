## 1. Database Schema & Infrastructure Setup

- [x] 1.1 Create migration SQL file `migrations/0001_create_persistence_tables.sql` containing schema definition for `players` and `matches` tables.
- [x] 1.2 Update `wrangler.toml` to configure the `d1_databases` binding named `DB` pointing to the database name `yacht_dice`.

## 2. Core Repository Types & Interfaces

- [x] 2.1 Create type declarations and interface tags in `src/persistence/repository.ts` (or equivalent file) for `PlayerStats`, `MatchRecord`, `PlayerRepository`, and `MatchRepository`.
- [x] 2.2 Define the `D1Database` Context Tag in Effect.ts to allow clean injection of Cloudflare D1 environment bindings.

## 3. D1 Repository Implementations

- [x] 3.1 Implement the `D1PlayerRepositoryLive` layer using D1 prepared statements to support `upsertPlayer`, `getPlayer`, `updateStats`, and `getLeaderboard`.
- [x] 3.2 Implement the `D1MatchRepositoryLive` layer using D1 prepared statements to support `saveMatch` and `getRecentMatches`.
- [x] 3.3 Write unit tests in `src/persistence/d1.test.ts` (or similar) to verify the repositories by mocking D1 database client queries.
