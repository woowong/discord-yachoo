## ADDED Requirements

### Requirement: CLI Last Turn Action Display
The system SHALL display the previous turn's action details on the CLI console board when there is a record of previous turns in the current game.

#### Scenario: Rendering CLI board with turn history
- **WHEN** rendering the board in the CLI simulator and the game has at least one record in `turnHistory`
- **THEN** the system MUST extract the last turn record, format the action details (including player name, chosen category, score, and final dice values), and print this information below the scoreboard.
