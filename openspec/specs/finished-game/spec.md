# finished-game Specification

## Purpose
TBD - created by archiving change fix-finished-game-buttons-and-error-format. Update Purpose after archive.
## Requirements
### Requirement: Discord components removal on game finish
The system SHALL ensure that when a game transitions to the `Finished` status, all Discord interaction components (buttons and dropdown menus) are completely removed from the message.

#### Scenario: Clearing buttons upon game completion
- **WHEN** the last active player records a score in their final empty category
- **THEN** the game status changes to "Finished"
- **THEN** the serializer outputs an empty `components` array to clear the buttons from the Discord message

### Requirement: Human-readable domain error messages
The system SHALL return standard human-readable messages when domain logic errors occur, instead of unformatted Javascript object representations.

#### Scenario: Error while performing actions on a finished game
- **WHEN** a player tries to roll dice in a game that has a "Finished" status
- **THEN** the system fails with a `GameAlreadyOverError` containing a descriptive message
- **THEN** the Discord integration handler formats this error and replies with a readable string starting with "❌ Error: Game <id> is already over."

### Requirement: UI refresh on actions against finished games
If a player interacts with buttons on a finished game message (e.g., from an older message where buttons were not yet cleared), the system SHALL gracefully update the message to reflect the finished state (without active components) instead of showing an error prompt.

#### Scenario: Stale roll button clicked on finished game
- **WHEN** a player clicks the "Roll Dice" button on a stale finished game message
- **THEN** the system catches the `GameAlreadyOverError`
- **THEN** the system returns the finished game state causing Discord to update the message and clear all active components

#### Scenario: Stale category select dropdown selected on finished game
- **WHEN** a player selects a category from a stale finished game message dropdown
- **THEN** the system catches the `GameAlreadyOverError`
- **THEN** the system returns the finished game state causing Discord to update the message and clear all active components

