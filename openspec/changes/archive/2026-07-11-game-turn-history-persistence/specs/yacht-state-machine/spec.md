## ADDED Requirements

### Requirement: Turn History and Roll Tracking
The system SHALL track and store all dice rolls and final score category selections made during a game. Specifically, it SHALL record the history of each turn, including the player's index/name, the turn number, all dice rolls made within that turn (Roll 1, Roll 2, Roll 3), the selected score category, and the score obtained.

#### Scenario: Appending roll history on roll
- **WHEN** the active player successfully rolls the dice
- **THEN** the resulting dice roll MUST be appended to the current turn's roll log

#### Scenario: Committing turn record on category selection
- **WHEN** the active player selects a category to complete their turn
- **THEN** the system MUST create a turn record with the current turn's rolls, selected category, and score, append it to the game's turn history list, and reset the current turn's roll log
