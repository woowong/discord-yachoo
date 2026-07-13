## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Elo rating migration
The system SHALL add an `elo` column to both `players` and `guild_player_stats` tables via a new migration script. Existing rows MUST receive a default Elo of 1000.

#### Scenario: Migration adds elo column
- **WHEN** the migration `0006_add_elo_rating.sql` is executed
- **THEN** both `players` and `guild_player_stats` tables MUST have an `elo` column of type INTEGER with NOT NULL constraint and DEFAULT 1000
- **THEN** all existing rows MUST have their elo column set to 1000
