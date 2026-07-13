## ADDED Requirements

### Requirement: Winner notification message on game end
The system SHALL send a separate Discord message (not an embed update) when a game ends, mentioning the winner via @mention. The message SHALL be sent as a reply to the original game message using `message_reference`.

#### Scenario: Multiplayer game winner notification
- **WHEN** a multiplayer game ends with a winner
- **THEN** the system MUST send a new message in the game channel containing the winner's @mention, both players' final scores, and Elo rating changes, formatted in an excited tone (e.g., "🎉🏆 @winner 님이 승리했습니다! 250점 대 180점! GG! 🎲")
- **THEN** the message MUST be a reply to the original game message

#### Scenario: Multiplayer game draw notification
- **WHEN** a multiplayer game ends in a draw
- **THEN** the system MUST send a new message mentioning both players with the tied score (e.g., "🤝 무승부! @player1 vs @player2 - 200점으로 동점!")

#### Scenario: Solo game completion notification
- **WHEN** a solo game ends
- **THEN** the system MUST send a new message with the player's final score (e.g., "🏁 게임 완료! @player 님의 최종 스코어: 250점")

### Requirement: DiscordApiService sendGameEndMessage method
The `DiscordApiService` interface SHALL expose a `sendGameEndMessage` method that sends a text message to a specified channel with an optional `message_reference` for reply threading.

#### Scenario: Sending game end message with reply
- **WHEN** `sendGameEndMessage` is called with a channelId, content string, and replyToMessageId
- **THEN** the system MUST send a POST request to the Discord API to create a message with the given content and `message_reference` pointing to the specified message

## MODIFIED Requirements

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
