## ADDED Requirements

### Requirement: Discord Game State Refresh Interaction
The system SHALL support a refresh component interaction (`refresh_game`) on game board messages to allow players to synchronize the Discord message with the latest authoritative server state.

#### Scenario: Refresh active game state
- **WHEN** a player clicks the `[ 🔄 새로고침 ]` button on an active game board message
- **THEN** the system SHALL fetch the latest game state from the repository and respond with an UpdateMessage (type 7) containing the latest serialized game embed and components.

#### Scenario: Refresh finished game state
- **WHEN** a player clicks the `[ 🔄 새로고침 ]` button on a message whose game is already finished
- **THEN** the system SHALL respond with an UpdateMessage (type 7) rendering the final completed game board.

#### Scenario: Refresh button rendered on active game board
- **WHEN** serializing the game board action components for an active game
- **THEN** the system SHALL include a refresh button (`refresh_game`) alongside the roll and surrender buttons.
