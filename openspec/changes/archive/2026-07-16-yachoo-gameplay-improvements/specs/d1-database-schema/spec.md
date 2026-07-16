## ADDED Requirements

### Requirement: Active Games Table Lifecycle Optimization
The system SHALL maintain a table for active game states. To optimize storage and queries, only ongoing (InProgress) games MUST be preserved in this table. When a game transitions to Finished (including surrender or complete), the system MUST delete the corresponding game state from the active games table.

#### Scenario: Clean up Finished Game from Active Games Table
- **WHEN** a game session transitions to Finished status via category scoring or surrender
- **THEN** the system SHALL delete the game state row from the `active_games` table.

#### Scenario: Retroactive Cleanup Migration
- **WHEN** the schema cleanup migration is executed on the database
- **THEN** all legacy game rows in the `active_games` table with a parsed state JSON status of "Finished" MUST be deleted from the database.
