## 1. Database Schema Migration

- [x] 1.1 Create migration file `migrations/0004_separate_solo_and_multi.sql` to add the 6 new statistics columns to the `players` table and copy baseline legacy data.

## 2. Domain & Persistence Layer Updates

- [x] 2.1 Update `PlayerStats` interface in `src/persistence/repository.ts` to include the 6 new fields: `soloPlayCount`, `soloHighestScore`, `multiWins`, `multiLosses`, `multiDraws`, and `multiHighestScore`.
- [x] 2.2 Update `PlayerRepository` interface in `src/persistence/repository.ts` to add `mode` to `updateStats` and `getLeaderboard` method signatures.
- [x] 2.3 Update D1 database row interface, mapping function, `updateStats` implementation, and `getLeaderboard` implementation in `src/persistence/d1/repository.ts`.

## 3. Presentation Layer & Command Updates

- [x] 3.1 Update `scripts/register-commands.ts` to add the `type` option to the `/leaderboard` slash command.
- [x] 3.2 Update `/profile` command handler in `src/index.ts` to extract and display separated solo and matching stats.
- [x] 3.3 Update `/leaderboard` command handler in `src/index.ts` to retrieve the `type` option, invoke `getLeaderboard` with correct mode, and pass it to the serializer.
- [x] 3.4 Update `serializeLeaderboard` signature and formatting logic in `src/presentation/discord/adapter/serializer.ts` to display stats corresponding to the selected mode.
- [x] 3.5 Update the game-ending score persistence logic in `src/index.ts` to pass `mode: "single"` or `mode: "multi"` to `updateStats`.

## 4. Verification & Testing

- [x] 4.1 Update repository tests in `src/persistence/d1.test.ts` to mock and verify the updated `updateStats` and `getLeaderboard` logic.
- [x] 4.2 Update integration tests in `src/index.test.ts` to mock and verify `/profile` and `/leaderboard` command outputs.
- [x] 4.3 Run test suite to verify all unit/integration tests pass.
