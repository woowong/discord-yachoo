## ADDED Requirements

### Requirement: Match History JSON Storage
The system SHALL support storing the serialized turn-by-turn history of a match in the database. When a match ends, the complete game turn history list MUST be serialized into JSON format and saved in a dedicated `history_json` column of the `matches` table.

#### Scenario: Saving match with history JSON
- **WHEN** `saveMatch` is called with a match record containing history JSON content
- **THEN** the system MUST insert the match record including the `history_json` field into the database

### Requirement: Get Match by ID
The MatchRepository SHALL support retrieving a specific match record by its unique identifier (`matchId`).

#### Scenario: Successfully retrieve match by ID
- **WHEN** `getMatchById` is called with an existing `matchId`
- **THEN** the system MUST return the MatchRecord containing its scores, winner, and `historyJson`
