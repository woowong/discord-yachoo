## MODIFIED Requirements

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

## ADDED Requirements

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
