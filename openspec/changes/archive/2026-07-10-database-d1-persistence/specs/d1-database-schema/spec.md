## ADDED Requirements

### Requirement: Database Schema Definition
The system SHALL define a database schema for `players` and `matches` using an SQLite-compatible SQL migration script.

#### Scenario: Running the schema migration
- **WHEN** the schema migration script is executed in Cloudflare D1
- **THEN** `players` and `matches` tables are created with the correct columns, primary keys, and default values.

### Requirement: Players Table Structure
The `players` table MUST store individual player statistics, containing:
* `id` (TEXT, PRIMARY KEY): The unique Discord User ID.
* `name` (TEXT, NOT NULL): The player's display name.
* `wins` (INTEGER, NOT NULL, DEFAULT 0): The count of wins.
* `losses` (INTEGER, NOT NULL, DEFAULT 0): The count of losses.
* `draws` (INTEGER, NOT NULL, DEFAULT 0): The count of draws.
* `highest_score` (INTEGER, NOT NULL, DEFAULT 0): The highest score achieved by the player.
* `created_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP)
* `updated_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP)

#### Scenario: Player record creation
- **WHEN** a new player is registered in the database
- **THEN** default values of 0 for wins, losses, draws, and highest_score are applied.

### Requirement: Matches Table Structure
The `matches` table MUST store the history of played matches, containing:
* `id` (TEXT, PRIMARY KEY): The unique match identifier.
* `mode` (TEXT, NOT NULL): The game mode, either 'single' or 'multi'.
* `player1_id` (TEXT, NOT NULL): The primary player's ID.
* `player2_id` (TEXT, NULL): The opponent's ID, which is nullable for single-player games.
* `player1_score` (INTEGER, NOT NULL): The primary player's score.
* `player2_score` (INTEGER, NULL): The opponent's score, nullable for single-player games.
* `winner_id` (TEXT, NULL): The ID of the winner, or null in case of a draw or single-player game.
* `played_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP)

#### Scenario: Single-player match recording
- **WHEN** a single-player match is recorded
- **THEN** `player2_id`, `player2_score`, and `winner_id` SHALL be recorded as NULL.
