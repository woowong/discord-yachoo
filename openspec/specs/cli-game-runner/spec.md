# cli-game-runner Specification

## Purpose
야추 다이스 게임을 터미널(CLI) 환경에서 입출력을 주고받으며 1인/2인용 모드로 시뮬레이션할 수 있는 대화형 가상 실행기를 정의합니다.

## Requirements

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

#### Scenario: Display expected scores for available categories
- **WHEN** the player enters the category selection phase
- **THEN** the system MUST display the estimated score next to each 'Available' category based on the current dice roll

### Requirement: CLI Game Over Notification
The system SHALL print the final game state when all players' score boards are filled, announce the final score of each player, and determine the winner in multi-player mode before exiting.

#### Scenario: Game over with results
- **WHEN** the game state status transitions to 'Finished' after the final category is filled
- **THEN** the system MUST output the final scoreboards and announce the winner (or final score in single-player) and terminate the program execution

### Requirement: CLI Round Number Display
The system SHALL display the current round number on the CLI board presenter.

#### Scenario: Rendering round number on terminal board
- **WHEN** rendering the scoreboard during a turn in the CLI simulator
- **THEN** the system MUST display the current round number (1 to 12) on the turn status row (e.g. `(Round X/12, Roll Y/3)`)

### Requirement: CLI Last Turn Action Display
The system SHALL display the previous turn's action details on the CLI console board when there is a record of previous turns in the current game.

#### Scenario: Rendering CLI board with turn history
- **WHEN** rendering the board in the CLI simulator and the game has at least one record in `turnHistory`
- **THEN** the system MUST extract the last turn record, format the action details (including player name, chosen category, score, and final dice values), and print this information below the scoreboard.


