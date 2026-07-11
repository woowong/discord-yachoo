## ADDED Requirements

### Requirement: Discord Last Turn Action Display
The system SHALL display the previous turn's action details in the main Discord game embed when there is a record of previous turns in the current game.

#### Scenario: Rendering game board with turn history
- **WHEN** serializing the game state and the game has at least one record in `turnHistory`
- **THEN** the system MUST extract the last turn record, format the action details (including player name, chosen category, score, and final dice values with emoji representation), and append this information to the embed's description.
