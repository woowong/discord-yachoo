# elo-rating Specification

## Purpose
TBD - created by archiving change user-feedback-batch-v1. Update Purpose after archive.
## Requirements
### Requirement: Elo rating calculation
The system SHALL calculate Elo rating changes for both players at the end of a multiplayer match using the standard Elo formula: expected score `E_A = 1 / (1 + 10^((R_B - R_A) / 400))` and rating update `R'_A = R_A + K * (S_A - E_A)` where K-factor is 32.

#### Scenario: Winner gains rating, loser drops rating
- **WHEN** a multiplayer match ends with Player A (Elo 1000) winning against Player B (Elo 1000)
- **THEN** the system MUST calculate Player A's new rating as 1016 (delta +16) and Player B's new rating as 984 (delta -16)

#### Scenario: Upset victory yields larger rating change
- **WHEN** a multiplayer match ends with Player A (Elo 800) winning against Player B (Elo 1200)
- **THEN** Player A's rating increase MUST be larger than 16 and Player B's rating decrease MUST be larger than 16

#### Scenario: Draw between equal-rated players yields no change
- **WHEN** a multiplayer match ends in a draw between Player A (Elo 1000) and Player B (Elo 1000)
- **THEN** both players' ratings MUST remain unchanged (delta 0)

### Requirement: Elo minimum floor
The system SHALL enforce a minimum Elo rating of 100. No player's Elo SHALL drop below 100 regardless of match outcome.

#### Scenario: Rating does not drop below minimum
- **WHEN** a multiplayer match ends with Player A (Elo 105) losing to Player B (Elo 1500)
- **THEN** Player A's new rating MUST be no lower than 100

### Requirement: Elo rating persistence
The system SHALL store each player's Elo rating in the database. New players SHALL start with a default Elo of 1000. Elo ratings SHALL be scoped per guild via the `guild_player_stats` table.

#### Scenario: New player default Elo
- **WHEN** a new player plays their first multiplayer match in a guild
- **THEN** the player's Elo rating MUST be initialized to 1000

#### Scenario: Elo update after match
- **WHEN** a multiplayer match ends
- **THEN** both players' Elo ratings in the guild-scoped stats table MUST be updated with the calculated new ratings

### Requirement: Solo mode Elo exclusion
The system SHALL NOT apply Elo rating changes for single-player (solo) mode games.

#### Scenario: Solo game does not affect Elo
- **WHEN** a solo mode game ends
- **THEN** the player's Elo rating MUST remain unchanged

### Requirement: Elo display in profile
The system SHALL display the player's current Elo rating in the `/profile` command output for players who have played at least one multiplayer match.

#### Scenario: Profile shows Elo
- **WHEN** a player views their profile after playing multiplayer matches
- **THEN** the profile MUST display the player's current Elo rating

### Requirement: Elo-based multiplayer leaderboard
The system SHALL sort the multiplayer leaderboard by Elo rating in descending order, replacing the current wins-based sorting.

#### Scenario: Leaderboard sorted by Elo
- **WHEN** a user views the multiplayer leaderboard
- **THEN** players MUST be sorted by Elo rating from highest to lowest, and each entry MUST display the player's Elo rating

### Requirement: Elo change display on game end
The system SHALL display the Elo rating change for both players in the game-end notification message.

#### Scenario: Winner notification includes Elo change
- **WHEN** a multiplayer match ends
- **THEN** the notification message MUST include each player's Elo change (e.g., "Elo 1016 ▲+16" for the winner and "Elo 984 ▼-16" for the loser)

