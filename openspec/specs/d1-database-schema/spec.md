# d1-database-schema Specification

## Purpose
플레이어의 전적(승패무 기록 및 최고 점수)과 경기 이력(매치 데이터)을 유지하기 위해 Cloudflare D1 데이터베이스에 적용할 SQLite 테이블 구조와 마이그레이션 방안을 정의합니다.
## Requirements
### Requirement: Database Schema Definition
The system SHALL define a database schema for `players` and `matches` using an SQLite-compatible SQL migration script.

#### Scenario: Running the schema migration
- **WHEN** the schema migration script is executed in Cloudflare D1
- **THEN** `players` and `matches` tables are created with the correct columns, primary keys, and default values.

### Requirement: Players Table Structure
The `players` table MUST store individual player statistics, containing:
* `id` (TEXT, PRIMARY KEY): The unique Discord User ID.
* `name` (TEXT, NOT NULL): The player's display name.
* `wins` (INTEGER, NOT NULL, DEFAULT 0): The legacy count of wins (retained for compatibility).
* `losses` (INTEGER, NOT NULL, DEFAULT 0): The legacy count of losses (retained for compatibility).
* `draws` (INTEGER, NOT NULL, DEFAULT 0): The legacy count of draws (retained for compatibility).
* `highest_score` (INTEGER, NOT NULL, DEFAULT 0): The legacy highest score achieved by the player (retained for compatibility).
* `solo_play_count` (INTEGER, NOT NULL, DEFAULT 0): The count of completed solo games.
* `solo_highest_score` (INTEGER, NOT NULL, DEFAULT 0): The highest score in a solo game.
* `multi_wins` (INTEGER, NOT NULL, DEFAULT 0): The count of multiplayer wins.
* `multi_losses` (INTEGER, NOT NULL, DEFAULT 0): The count of multiplayer losses.
* `multi_draws` (INTEGER, NOT NULL, DEFAULT 0): The count of multiplayer draws.
* `multi_highest_score` (INTEGER, NOT NULL, DEFAULT 0): The highest score in a multiplayer game.
* `elo` (INTEGER, NOT NULL, DEFAULT 1000): The player's global Elo rating.
* `created_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP)
* `updated_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP)

#### Scenario: Player record creation with Elo
- **WHEN** a new player is registered in the database
- **THEN** default values of 0 for all statistics columns and 1000 for the Elo rating MUST be applied.

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
* `elo` (INTEGER, NOT NULL, DEFAULT 1000): The player's guild-scoped Elo rating.
* `created_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP)
* `updated_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP)
* PRIMARY KEY (`player_id`, `guild_id`)

#### Scenario: Initializing guild stats with Elo
- **WHEN** player statistics are updated for a player in a guild for the first time
- **THEN** a new row is inserted into `guild_player_stats` with all stats initialized to 0 and Elo initialized to 1000 before the update is applied.

### Requirement: Elo rating migration
The system SHALL add an `elo` column to both `players` and `guild_player_stats` tables via a new migration script. Existing rows MUST receive a default Elo of 1000.

#### Scenario: Migration adds elo column
- **WHEN** the migration `0006_add_elo_rating.sql` is executed
- **THEN** both `players` and `guild_player_stats` tables MUST have an `elo` column of type INTEGER with NOT NULL constraint and DEFAULT 1000
- **THEN** all existing rows MUST have their elo column set to 1000

### Requirement: Active Games Table Lifecycle Optimization
The system SHALL maintain a table for active game states. To optimize storage and queries, only ongoing (InProgress) games MUST be preserved in this table. When a game transitions to Finished (including surrender or complete), the system MUST delete the corresponding game state from the active games table.

#### Scenario: Clean up Finished Game from Active Games Table
- **WHEN** a game session transitions to Finished status via category scoring or surrender
- **THEN** the system SHALL delete the game state row from the `active_games` table.

#### Scenario: Retroactive Cleanup Migration
- **WHEN** the schema cleanup migration is executed on the database
- **THEN** all legacy game rows in the `active_games` table with a parsed state JSON status of "Finished" MUST be deleted from the database.

### Requirement: Match History Consistency Migration
The D1 database matches records SHALL maintain strict consistency between summary score columns (player1_score, player2_score) and the turn-by-turn historyJson total sum.

#### Scenario: One-time migration for legacy inconsistent match records
- **WHEN** a match record in the D1 matches table has mismatching summary scores relative to its turn-by-turn historyJson sum
- **THEN** the migration script MUST recalculate actual cumulative scores from historyJson and update player1_score, player2_score, and winner_id accordingly.

