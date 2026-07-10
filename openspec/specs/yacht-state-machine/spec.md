# yacht-state-machine Specification

## Purpose
야추 다이스의 게임 상태 관리, 턴 제어 및 상태 머신 흐름을 정의합니다.

## Requirements

### Requirement: Game Initialization
The system SHALL initialize a new game with the given list of players, a specified game mode (single or multi), and set the game status to 'Rolling' with the first player's turn active.

#### Scenario: Single-player game initialization
- **WHEN** initializing a game with 1 player and mode 'single'
- **THEN** the game state MUST have status 'Rolling', current player index 0, roll count 0, and all score board categories empty for the player

#### Scenario: Multi-player game initialization
- **WHEN** initializing a game with 2 players and mode 'multi'
- **THEN** the game state MUST have status 'Rolling', current player index 0, roll count 0, and all score board categories empty for both players

### Requirement: Dice Rolling and Holding
The system SHALL allow the active player to roll the dice, specifying which dice to hold (keep). Only the unheld dice SHALL be rolled. The roll count MUST increment by 1 on each roll, up to a maximum of 3 rolls per turn.

#### Scenario: First roll of the turn (no holds possible yet)
- **WHEN** the active player rolls the dice and the current roll count is 0
- **THEN** all 5 dice MUST be rolled, and the roll count MUST become 1

#### Scenario: Subsequent roll with holds
- **WHEN** the active player rolls the dice with the current roll count as 1, holding dice at indices `[true, false, true, false, true]`
- **THEN** only the dice at indices 1 and 3 MUST be rolled, and the roll count MUST become 2

#### Scenario: Roll limit exceeded
- **WHEN** the active player tries to roll the dice but the current roll count is 3
- **THEN** the system MUST return a `RollLimitExceededError` and prevent the roll

### Requirement: Score Category Selection
The active player SHALL be able to select an empty score category to record the score for their current dice roll. The category MUST not have been filled previously by this player.

#### Scenario: Successfully select an empty category
- **WHEN** the player has rolled at least once, selects an empty category 'Yacht', and the current roll is `[5, 5, 5, 5, 5]`
- **THEN** the category 'Yacht' MUST be filled with 50 points, the active player's score board MUST be updated, and the turn MUST transition

#### Scenario: Attempting to select an already filled category
- **WHEN** the player selects the category 'Aces' which has already been filled in a previous turn
- **THEN** the system MUST return a `CategoryAlreadyFilledError` and prevent the selection

#### Scenario: Attempting to select category without rolling
- **WHEN** the player tries to select a category but the roll count is 0
- **THEN** the system MUST return an `InvalidStateActionError` and prevent the selection

### Requirement: Turn Transition
Upon successful category selection, the system SHALL reset the roll count to 0, clear the current dice roll, and transition the turn. In multi-player mode, the turn MUST switch to the other player. In single-player mode, the turn MUST remain with the same player.

#### Scenario: Turn transition in multi-player mode
- **WHEN** player 1 (index 0) completes their turn by selecting a category in 'multi' mode
- **THEN** the current player index MUST become 1, status MUST reset to 'Rolling', and roll count MUST reset to 0

#### Scenario: Turn transition in single-player mode
- **WHEN** player 1 (index 0) completes their turn by selecting a category in 'single' mode
- **THEN** the current player index MUST remain 0, status MUST reset to 'Rolling', and roll count MUST reset to 0

### Requirement: Game Over and Winner Determination
The game SHALL transition to the 'Finished' status when all categories (12 categories) have been filled for all players. The system SHALL calculate the final scores including bonuses and determine the winner.

#### Scenario: Single-player game completion
- **WHEN** the single player fills their 12th and final category
- **THEN** the game status MUST become 'Finished', and the game MUST end

#### Scenario: Multi-player game completion and winner determination
- **WHEN** both players in 'multi' mode have filled all 12 categories
- **THEN** the game status MUST become 'Finished', and the player with the higher total score (including subtotal bonus) MUST be declared the winner
