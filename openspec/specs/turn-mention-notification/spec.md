# turn-mention-notification Specification

## Purpose
TBD - created by archiving change turn-mention-notification. Update Purpose after archive.
## Requirements
### Requirement: Send Mention on Turn Transition
The system SHALL send a notification mention message to the next player's Discord channel when a turn transitions to another player in a multi-player matchmaking game as a reply to the game interaction message, and store the sent message ID and channel ID in the `GameState`.

#### Scenario: Send mention message on turn change
- **WHEN** the current player completes their turn by selecting a category, transitioning the turn to the other player in a multi-player game
- **THEN** the system SHALL send a reply mention message targeting the next player to the Discord channel referencing the game board message, retrieve its message ID, and update `GameState` with `lastMentionMessageId` and `lastMentionChannelId`.

### Requirement: Delete Mention on Player Action
The system SHALL delete the active turn mention message using the stored message ID when the next player performs a turn action (e.g., rolling dice, toggling holds) as an acknowledgment (ACK), and clear the stored message ID from the `GameState`.

#### Scenario: Delete mention on roll action
- **WHEN** the player performs a dice roll action and there is a valid `lastMentionMessageId` stored in the `GameState`
- **THEN** the system SHALL delete the corresponding mention message from the Discord channel and clear the mention metadata from the `GameState`.

#### Scenario: Delete mention on hold toggle action
- **WHEN** the player performs a dice hold toggle action and there is a valid `lastMentionMessageId` stored in the `GameState`
- **THEN** the system SHALL delete the corresponding mention message from the Discord channel and clear the mention metadata from the `GameState`.

### Requirement: Isolation of Message Resources
The system SHALL isolate all Korean gameplay message templates (teasing pools, celebration pools, match result messages) and localization logic from the main application entry point. All inline mentions inside these templates (teasing/celebrations) MUST receive and render the player's numerical Discord User ID rather than their username or nickname to ensure they render as active Discord user tags.

#### Scenario: Load message resources from message bundle
- **WHEN** a gameplay notification (e.g. Yacht celebration, zero-streak tease) is triggered
- **THEN** the system SHALL load the localized Korean text patterns from a dedicated message bundle or presenter without inline string templates in `index.ts`, passing the player's numerical Discord User ID to resolve mentions.

