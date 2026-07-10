## ADDED Requirements

### Requirement: CLI Game Loop Initialization
The system SHALL initialize a new game session in CLI by asking the user to choose the Game Mode (single or multi) and inputting the player names, then initialize the domain game engine state.

#### Scenario: Single-player mode initialization
- **WHEN** the user starts the CLI simulator, selects 'single' mode, and inputs player name "PlayerA"
- **THEN** the system MUST initialize the game with 1 player, set current player to "PlayerA", and transition to the dice rolling phase

#### Scenario: Multi-player mode initialization
- **WHEN** the user starts the CLI simulator, selects 'multi' mode, and inputs player names "PlayerA" and "PlayerB"
- **THEN** the system MUST initialize the game with 2 players, set the current player to "PlayerA" (index 0), and transition to the dice rolling phase

### Requirement: CLI Game Loop Turn Handling
The system SHALL render the complete scoreboards of all players, current dice values, current active player, and the remaining roll count of the current turn using the terminal console.

#### Scenario: Rendering scoreboard on turn start
- **WHEN** a player's turn begins or after rolling dice
- **THEN** the terminal MUST print a visual ASCII scoreboard showing all categories, subtotal, upper bonus, and total score for all players, alongside the current 5 dice faces and remaining roll attempts

### Requirement: CLI Dice Roll and Hold Input
The system SHALL accept CLI commands from the active player to either roll the dice (with optional indices to hold) or proceed to the score categorization phase.

#### Scenario: First roll inputs
- **WHEN** the active player has roll count 0 and enters a roll command
- **THEN** the system MUST roll all 5 dice and transition the status to 'Scoring'

#### Scenario: Subsequent roll inputs with holds
- **WHEN** the active player has roll count 1 or 2, inputs a roll command with specific dice indices to hold (e.g. "roll 1 2 5")
- **THEN** the system MUST hold the dice at indices 1, 2, and 5, roll the rest (indices 3 and 4), and update the game state

#### Scenario: Stop rolling early and select category
- **WHEN** the active player decides to record a score before reaching the maximum 3 rolls
- **THEN** the system MUST skip the remaining roll attempts and prompt for score category selection

### Requirement: CLI Category Selection
The system SHALL prompt the active player to choose an empty score category to write their current roll score, validate that the category is empty, and record the score via the domain engine.

#### Scenario: Category selection records score and transitions turn
- **WHEN** the active player selects an empty category (e.g., 'Yacht') after rolling
- **THEN** the score board for 'Yacht' MUST be populated, and the turn MUST transition to the next player (or remain with the same player in single-player mode) with the roll count reset to 0

### Requirement: CLI Game Over Notification
The system SHALL print the final game state when all players' score boards are filled, announce the final score of each player, and determine the winner in multi-player mode before exiting.

#### Scenario: Game over with results
- **WHEN** the game state status transitions to 'Finished' after the final category is filled
- **THEN** the system MUST output the final scoreboards and announce the winner (or final score in single-player) and terminate the program execution
