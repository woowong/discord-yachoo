## 1. Domain Types & State Logic

- [x] 1.1 Update `src/domain/types.ts` to define `TurnRecord` and add `turnHistory` and `currentTurnRolls` fields to `GameState`.
- [x] 1.2 Update `initGame` in `src/domain/game.ts` to initialize `turnHistory` as `[]` and `currentTurnRolls` as `[]`.
- [x] 1.3 Update `rollDice` in `src/domain/game.ts` to append final dice rolls to `currentTurnRolls`.
- [x] 1.4 Update `selectCategory` in `src/domain/game.ts` to compile the `TurnRecord` for the turn, append it to `turnHistory`, and reset `currentTurnRolls`.
- [x] 1.5 Add unit tests in `src/domain/game.test.ts` to verify the accuracy of `turnHistory` and `currentTurnRolls` state changes.

## 2. Persistence Layer Updates

- [x] 2.1 Create the migration SQL file `migrations/0003_add_match_history.sql` to add `history_json` column to the `matches` table.
- [x] 2.2 Update `MatchRecord` type in `src/persistence/repository.ts` to include `historyJson?: string | null` and add `getMatchById` to `MatchRepository`.
- [x] 2.3 Update `D1MatchRepositoryLive` in `src/persistence/d1/repository.ts` to save `historyJson` in `saveMatch` and map `history_json` in `getRecentMatches`.
- [x] 2.4 Implement `getMatchById` in `D1MatchRepositoryLive` inside `src/persistence/d1/repository.ts`.
- [x] 2.5 Update persistence unit tests in `src/persistence/d1.test.ts` to cover `getMatchById` and `historyJson` storage in `saveMatch`.

## 3. UI & Serializer Enhancements

- [x] 3.1 Update `serializeGame` in `src/presentation/discord/adapter/serializer.ts` to compute and display the current round number (e.g. `Round: X / 12`).
- [x] 3.2 Update `ConsolePresenterLive` in `src/presentation/console/presenter.ts` to display the current round number.
- [x] 3.3 Add `serializeHistoryList` and `serializeHistoryDetails` methods to `DiscordResponseSerializer` in `src/presentation/discord/adapter/serializer.ts`.
- [x] 3.4 Implement paging (Page 1 for Rounds 1-6, Page 2 for Rounds 7-12) and button generation in `serializeHistoryDetails`.

## 4. Discord Bot Handler & Routing

- [x] 4.1 Update `scripts/register-commands.ts` to add the `/history` slash command and run the registration script.
- [x] 4.2 Update `src/index.ts` on game completion (`selectCategory` ➔ `"Finished"`) to pass `nextState.turnHistory` serialized as JSON into `matchRecord.historyJson`.
- [x] 4.3 Update command router in `src/index.ts` to handle `/history` command by fetching recent matches and returning `serializeHistoryList`.
- [x] 4.4 Update component interaction router in `src/index.ts` to handle button interactions starting with `viewhistory_` and `pagehistory_`.
- [x] 4.5 Verify end-to-end integration and run tests to ensure all tests pass.
