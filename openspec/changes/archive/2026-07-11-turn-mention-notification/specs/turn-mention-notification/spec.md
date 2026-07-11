## ADDED Requirements

### Requirement: Send Mention on Turn Transition
The system SHALL send a notification mention message to the next player's Discord channel when a turn transitions to another player in a multi-player matchmaking game, and store the sent message ID and channel ID in the `GameState`.

#### Scenario: Send mention message on turn change
- **WHEN** the current player completes their turn by selecting a category, transitioning the turn to the other player in a multi-player game
- **THEN** the system SHALL send a mention message targeting the next player to the Discord channel, retrieve its message ID, and update `GameState` with `lastMentionMessageId` and `lastMentionChannelId`.

### Requirement: Delete Mention on Player Action
The system SHALL delete the active turn mention message using the stored message ID when the next player performs a turn action (e.g., rolling dice, toggling holds) as an acknowledgment (ACK), and clear the stored message ID from the `GameState`.

#### Scenario: Delete mention on roll action
- **WHEN** the player performs a dice roll action and there is a valid `lastMentionMessageId` stored in the `GameState`
- **THEN** the system SHALL delete the corresponding mention message from the Discord channel and clear the mention metadata from the `GameState`.

#### Scenario: Delete mention on hold toggle action
- **WHEN** the player performs a dice hold toggle action and there is a valid `lastMentionMessageId` stored in the `GameState`
- **THEN** the system SHALL delete the corresponding mention message from the Discord channel and clear the mention metadata from the `GameState`.
