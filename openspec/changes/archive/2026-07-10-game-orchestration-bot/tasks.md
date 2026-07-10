## 1. Database Schema & Repository Configuration

- [x] 1.1 Create a new migration file `migrations/0002_create_active_games.sql` to add the `active_games` table in D1.
- [x] 1.2 Move `GameRepository` interface and `RepositoryError` to `src/persistence/repository.ts`.
- [x] 1.3 Implement `D1GameRepositoryLive` in `src/persistence/d1/repository.ts` that saves and retrieves serialized `GameState` from the `active_games` table.

## 2. Discord Webhook Entry Point & Routing

- [x] 2.1 Update `src/index.ts` to verify signatures using `DiscordSignatureVerifier` and handle webhook requests.
- [x] 2.2 Implement a router in `src/index.ts` or a new handler module to route PING, Command, and Component interactions.

## 3. Slash Command Handler Implementation

- [x] 3.1 Implement the `/challenge` slash command to initialize and save single-player or multiplayer games.
- [x] 3.2 Implement the `/profile` slash command to retrieve and display user stats from `PlayerRepository`.
- [x] 3.3 Implement the `/leaderboard` slash command to retrieve and display top players.

## 4. Component Interaction Handler Implementation

- [x] 4.1 Implement game ID extraction from the message embed footer in component interactions.
- [x] 4.2 Implement the dice roll button interaction handler (`roll_`).
- [x] 4.3 Implement the dice hold button interaction handler (`hold_`).
- [x] 4.4 Implement the category select menu interaction handler (`select_category`). Ensure that if a game ends, stats are updated via `PlayerRepository` and the match is saved via `MatchRepository`.

## 5. Command Registration Script

- [x] 5.1 Implement `scripts/register-commands.ts` to register slash commands `/challenge`, `/profile`, and `/leaderboard` with Discord.

## 6. Integration and Validation Testing

- [x] 6.1 Implement integration tests in `src/index.test.ts` or similar to verify signature validation, routing, slash commands, and component interactions with mock D1 database.
