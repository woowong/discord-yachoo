## MODIFIED Requirements

### Requirement: Turn History and Roll Tracking
The system SHALL track and store all dice rolls and final score category selections made during a game. Specifically, it SHALL record the history of each turn, including the player's index/name, the turn number, all dice rolls made within that turn (Roll 1, Roll 2, Roll 3), the selected score category, the score obtained, and the player's cumulative score after completing the turn. The cumulative score MUST include the upper section bonus when the upper section threshold has been reached.

#### Scenario: Appending roll history on roll
- **WHEN** the active player successfully rolls the dice
- **THEN** the resulting dice roll MUST be appended to the current turn's roll log

#### Scenario: Committing turn record on category selection
- **WHEN** the active player selects a category to complete their turn
- **THEN** the system MUST create a turn record with the current turn's rolls, selected category, score, and cumulative score, append it to the game's turn history list, and reset the current turn's roll log

#### Scenario: Recording the upper bonus in turn history
- **WHEN** a category selection causes the player's upper section sum to reach 63 or higher
- **THEN** the turn record's cumulative score MUST include the additional 35-point upper section bonus
- **AND** subsequent turn records for that player MUST retain the bonus in their cumulative score
