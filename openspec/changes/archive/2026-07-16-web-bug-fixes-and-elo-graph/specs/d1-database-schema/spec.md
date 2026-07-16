## MODIFIED Requirements

### Requirement: Matches Table Structure
The `matches` table MUST store the history of played matches, containing:
* `id` (TEXT, PRIMARY KEY): The unique match identifier.
* `mode` (TEXT, NOT NULL): The game mode, either 'single' or 'multi'.
* `guild_id` (TEXT, NULL): The Discord server ID where the match was played, nullable for legacy games or DMs.
* `player1_id` (TEXT, NOT NULL): The primary player's ID.
* `player2_id` (TEXT, NULL): The opponent's ID, which is nullable for single-player games.
* `player1_score` (INTEGER, NOT NULL): The primary player's score.
* `player2_score` (INTEGER, NULL): The opponent's score, nullable for single-player games.
* `winner_id` (TEXT, NULL): The ID of the winner, or null in case of a draw or single-player game.
* `played_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP)
* `player1_elo_after` (INTEGER, NULL): The Elo rating of player 1 after the match.
* `player2_elo_after` (INTEGER, NULL): The Elo rating of player 2 after the match.

#### Scenario: Single-player match recording
- **WHEN** a single-player match is recorded
- **THEN** `player2_id`, `player2_score`, and `winner_id` SHALL be recorded as NULL.

#### Scenario: Multi-player match recording with Elo ratings
- **WHEN** a multi-player match is completed and Elo change is calculated
- **THEN** the system SHALL store the updated post-match Elo ratings in `player1_elo_after` and `player2_elo_after` columns.
