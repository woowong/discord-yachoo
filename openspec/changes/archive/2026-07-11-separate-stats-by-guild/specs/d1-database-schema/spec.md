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

#### Scenario: Single-player match recording
- **WHEN** a single-player match is recorded
- **THEN** `player2_id`, `player2_score`, and `winner_id` SHALL be recorded as NULL.

## ADDED Requirements

### Requirement: Guild-Specific Player Stats Table Structure
The system SHALL maintain a dedicated database table `guild_player_stats` to store player statistics scoped to individual Discord servers, containing:
* `player_id` (TEXT, NOT NULL)
* `guild_id` (TEXT, NOT NULL)
* `wins` (INTEGER, NOT NULL, DEFAULT 0)
* `losses` (INTEGER, NOT NULL, DEFAULT 0)
* `draws` (INTEGER, NOT NULL, DEFAULT 0)
* `highest_score` (INTEGER, NOT NULL, DEFAULT 0)
* `solo_play_count` (INTEGER, NOT NULL, DEFAULT 0)
* `solo_highest_score` (INTEGER, NOT NULL, DEFAULT 0)
* `multi_wins` (INTEGER, NOT NULL, DEFAULT 0)
* `multi_losses` (INTEGER, NOT NULL, DEFAULT 0)
* `multi_draws` (INTEGER, NOT NULL, DEFAULT 0)
* `multi_highest_score` (INTEGER, NOT NULL, DEFAULT 0)
* `created_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP)
* `updated_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP)
* PRIMARY KEY (`player_id`, `guild_id`)

#### Scenario: Initializing guild stats
- **WHEN** player statistics are updated for a player in a guild for the first time
- **THEN** a new row is inserted into `guild_player_stats` with all stats initialized to 0 before the update is applied.
