## ADDED Requirements

### Requirement: Player Surrender
The system SHALL allow any active player participating in the game to surrender (forfeit) the game at any point, regardless of whose turn it is. Upon surrender, the game status MUST transition immediately to 'Finished', and the surrendering player's ID MUST be recorded in the game state.

#### Scenario: Active player surrenders in multiplayer game
- **WHEN** player 1 (index 0) in 'multi' mode decides to surrender
- **THEN** the game status MUST immediately become 'Finished', and the game state's `surrenderedPlayerId` MUST be set to player 1's ID

#### Scenario: Non-participant attempts to surrender
- **WHEN** a user who is not part of the game's players attempts to surrender
- **THEN** the system MUST return an `InvalidStateActionError` and prevent the action

#### Scenario: Attempting to surrender a finished game
- **WHEN** a player attempts to surrender a game that already has status 'Finished'
- **THEN** the system MUST return a `GameAlreadyOverError` and prevent the action

## MODIFIED Requirements

### Requirement: Game Over and Winner Determination
The game SHALL transition to the 'Finished' status when all categories (12 categories) have been filled for all players, or when a player surrenders the game. The system SHALL calculate the final scores including bonuses and determine the winner. If the game ends due to a player surrendering, the other player SHALL be declared the winner immediately, and the surrendering player's ELO rating outcome is marked as a loss.

#### Scenario: Single-player game completion
- **WHEN** the single player fills their 12th and final category
- **THEN** the game status MUST become 'Finished', and the game MUST end

#### Scenario: Multi-player game completion and winner determination
- **WHEN** both players in 'multi' mode have filled all 12 categories
- **THEN** the game status MUST become 'Finished', and the player with the higher total score (including subtotal bonus) MUST be declared the winner

#### Scenario: Multi-player game completion via surrender
- **WHEN** a multiplayer game is finished due to player 1 surrendering (i.e. `surrenderedPlayerId` is player 1)
- **THEN** the game status MUST become 'Finished', and player 2 MUST be declared the winner of the match
