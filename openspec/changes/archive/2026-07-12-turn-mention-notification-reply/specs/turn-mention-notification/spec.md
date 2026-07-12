## MODIFIED Requirements

### Requirement: Send Mention on Turn Transition
The system SHALL send a notification mention message to the next player's Discord channel when a turn transitions to another player in a multi-player matchmaking game as a reply to the game interaction message, and store the sent message ID and channel ID in the `GameState`.

#### Scenario: Send mention message on turn change
- **WHEN** the current player completes their turn by selecting a category, transitioning the turn to the other player in a multi-player game
- **THEN** the system SHALL send a reply mention message targeting the next player to the Discord channel referencing the game board message, retrieve its message ID, and update `GameState` with `lastMentionMessageId` and `lastMentionChannelId`.
