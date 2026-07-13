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
The system SHALL allow the active player to roll the dice, specifying which dice to hold (keep). Only the unheld dice SHALL be rolled. The roll count MUST increment by 1 on each roll, up to a maximum of 3 rolls per turn. The system SHALL prevent rolling when all 5 dice are held.

#### Scenario: First roll of the turn (no holds possible yet)
- **WHEN** the active player rolls the dice and the current roll count is 0
- **THEN** all 5 dice MUST be rolled, and the roll count MUST become 1

#### Scenario: Subsequent roll with holds
- **WHEN** the active player rolls the dice with the current roll count as 1, holding dice at indices `[true, false, true, false, true]`
- **THEN** only the dice at indices 1 and 3 MUST be rolled, and the roll count MUST become 2

#### Scenario: Roll limit exceeded
- **WHEN** the active player tries to roll the dice but the current roll count is 3
- **THEN** the system MUST return a `RollLimitExceededError` and prevent the roll

#### Scenario: All dice held prevents rolling
- **WHEN** the active player attempts to roll the dice with holds `[true, true, true, true, true]` and the roll count is greater than 0
- **THEN** the system MUST return an `AllDiceHeldError` and prevent the roll without incrementing the roll count

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

### Requirement: Turn History and Roll Tracking
The system SHALL track and store all dice rolls and final score category selections made during a game. Specifically, it SHALL record the history of each turn, including the player's index/name, the turn number, all dice rolls made within that turn (Roll 1, Roll 2, Roll 3), the selected score category, and the score obtained.

#### Scenario: Appending roll history on roll
- **WHEN** the active player successfully rolls the dice
- **THEN** the resulting dice roll MUST be appended to the current turn's roll log

#### Scenario: Committing turn record on category selection
- **WHEN** the active player selects a category to complete their turn
- **THEN** the system MUST create a turn record with the current turn's rolls, selected category, and score, append it to the game's turn history list, and reset the current turn's roll log

### Requirement: Roll button disabled when all dice held
The Discord presentation layer SHALL disable the Roll Dice button when all 5 dice are in the held state, preventing the user from attempting a no-op roll.

#### Scenario: All dice held disables roll button
- **WHEN** the game UI is rendered with all 5 dice in held state (holds = "11111")
- **THEN** the Roll Dice button MUST be rendered with `disabled: true`

#### Scenario: Partial holds keep roll button enabled
- **WHEN** the game UI is rendered with 4 dice held and 1 unheld (e.g., holds = "11110")
- **THEN** the Roll Dice button MUST remain enabled

### Requirement: Mobile-optimized scoreboard rendering
The Discord presentation layer SHALL render the scoreboard within a maximum width of 27 characters to ensure it displays correctly on mobile Discord clients without line wrapping. Player names SHALL be truncated to a maximum of 4 characters. Category labels SHALL be shortened to fit within 10 characters.

#### Scenario: Scoreboard renders within 27 characters for 2-player game
- **WHEN** the scoreboard is rendered for a 2-player game
- **THEN** every line of the code block MUST be 27 characters or fewer

#### Scenario: Player name truncation
- **WHEN** a player's name is "야추마스터" (5 characters)
- **THEN** the displayed name in the scoreboard MUST be truncated to 4 characters ("야추마스")

### Requirement: Bonus threshold progress display
The Discord presentation layer SHALL display the upper section subtotal as a progress indicator in the format `currentSum/63`, showing the player's progress toward the bonus threshold of 63 points.

#### Scenario: Subtotal shows progress toward bonus
- **WHEN** a player has scored Aces=3 and Fours=16 (subtotal 19) and all other upper categories are empty
- **THEN** the subtotal row MUST display `19/63` for that player

#### Scenario: Subtotal at or above bonus threshold
- **WHEN** a player has an upper section sum of 65
- **THEN** the subtotal row MUST display `65/63` for that player

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

