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
* `created_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP)
* `updated_at` (DATETIME, DEFAULT CURRENT_TIMESTAMP)

#### Scenario: Player record creation
- **WHEN** a new player is registered in the database
- **THEN** default values of 0 for all statistics columns (wins, losses, draws, highest_score, solo_play_count, solo_highest_score, multi_wins, multi_losses, multi_draws, multi_highest_score) are applied.
