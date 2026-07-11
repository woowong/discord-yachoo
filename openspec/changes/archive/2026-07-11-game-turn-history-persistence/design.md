## Context

Players want to review the exact sequence of dice rolls and categories selected in past matches. Furthermore, they need a clear visual indicator of the current round number (1 to 12) during active games. Currently, no turn history is tracked in the game state, no column exists in the database for history, and there is no Discord command to query past games.

## Goals / Non-Goals

**Goals:**
- Dynamically track all rolls and category selections inside the pure `GameState` domain model.
- Display the current round number (e.g. `Round: 3 / 12`) on both the Discord game embed and CLI simulator.
- Save the complete turn history as serialized JSON in the `matches` table on Cloudflare D1 when a match finishes.
- Implement `/history` command to list the 5 most recent matches for a player.
- Implement interactive Discord buttons to view detailed round-by-round logs of a specific match, complete with pagination (Page 1: Rounds 1-6, Page 2: Rounds 7-12) to stay within Discord embed limits.

**Non-Goals:**
- Creating a separate SQL table for individual turns (SQL queries on individual turns are not needed).
- Building web views or real-time game logs.

## Decisions

### 1. In-Memory Domain Turn Tracking
- **Option 1 (Chosen)**: Track `currentTurnRolls` and `turnHistory` directly within `GameState` in `src/domain/types.ts`.
- **Option 2**: Insert records to database on every roll.
- **Rationale**: Option 1 maintains the pure functional architecture defined in `AGENTS.md`. The game transitions remain pure functions (`initGame`, `rollDice`, `selectCategory`), making them easy to unit test. The state is serialized to D1's `active_games` table automatically during active play.

### 2. JSON Storage in Matches Table
- **Option 1 (Chosen)**: Add a `history_json TEXT` column to the `matches` table.
- **Option 2**: Create a separate `turn_history` table.
- **Rationale**: Option 1 is simpler, requires fewer database operations on Workers, and simplifies queries since the entire history is read in a single query. We do not need to perform relational searches on individual turns.

### 3. Paging for Discord Match Details
- **Option 1 (Chosen)**: Divide the detailed breakdown into two pages (Rounds 1–6 and Rounds 7–12) navigated via buttons.
- **Option 2**: Output all 12 rounds in a single embed.
- **Rationale**: Option 2 risks hitting Discord's 4000-character embed description limit (especially with two players). Option 1 ensures the content fits, keeps the layout clean, and utilizes interactive buttons.

## Risks / Trade-offs

- **Risk**: SQLite `ALTER TABLE ADD COLUMN` migration compatibility.
  - *Mitigation*: Cloudflare D1 supports standard SQLite ALTER TABLE. We will implement `0003_add_match_history.sql` migration.
- **Risk**: Missing history for old matches in the database.
  - *Mitigation*: Make `history_json` nullable in the schema so old matches do not break the application. `/history` will handle null values by displaying "Match details not found or legacy game."
