## MODIFIED Requirements

### Requirement: Match History JSON Storage
The system SHALL support storing the serialized turn-by-turn history of a match in the database. When a match ends, the complete game turn history list MUST be serialized into JSON format and saved in a dedicated `history_json` column of the `matches` table. Each turn record MUST preserve both the score obtained for that turn and the player's cumulative score after the turn, with the cumulative score including any earned upper section bonus.

#### Scenario: Saving match with history JSON
- **WHEN** `saveMatch` is called with a match record containing history JSON content
- **THEN** the system MUST insert the match record including the `history_json` field into the database
- **AND** the stored history JSON MUST retain each turn's bonus-inclusive cumulative score when that field is present

## ADDED Requirements

### Requirement: Legacy Match History Compatibility
Consumers of match history MUST remain able to display and analyze history JSON created before cumulative scores were added. When a legacy turn record has no cumulative score, the consumer MUST derive the player's cumulative score from the recorded turn scores and apply the 35-point upper section bonus when that player's recorded upper section scores total 63 or higher.

#### Scenario: Reading history without cumulative score
- **WHEN** a stored turn record contains a turn score but no cumulative score
- **THEN** the history consumer MUST calculate a compatible cumulative score using the recorded scores and upper section bonus rule
- **AND** the consumer MUST display the derived value without changing the stored legacy JSON
