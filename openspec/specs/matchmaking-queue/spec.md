# matchmaking-queue Specification

## Purpose
채널 내 누구나 참여할 수 있는 오픈 매치메이킹 대기열(5분 만료)을 생성하고, 다른 플레이어의 즉시 매칭 및 생성자의 취소 요청을 관리한다.
## Requirements
### Requirement: Open Matchmaking Queue Creation
The system SHALL allow players to create an open game lobby with a 5-minute expiration in the channel.

#### Scenario: Player creates an open match queue
- **WHEN** Player A executes `/match`
- **THEN** system creates a match queue record with status `WAITING` and posts a message with `[Join Match]` and `[Cancel Lobby]` buttons.

### Requirement: Joining an Open Matchmaking Queue
The system SHALL allow any channel member except the host to join an open lobby, immediately matching the players into an active game.

#### Scenario: Another player joins open match queue
- **WHEN** Player B clicks `[Join Match]` on Player A's open queue within 300 seconds of creation
- **THEN** system updates match queue status to `MATCHED` and initializes an active 2-player `GameState` between Player A and Player B.

#### Scenario: Host attempts to join own open queue
- **WHEN** Player A clicks `[Join Match]` on their own open queue
- **THEN** system responds with an ephemeral error stating that the host cannot join their own lobby.

### Requirement: Cancelling an Open Matchmaking Queue
The system SHALL allow only the lobby host to cancel their open queue.

#### Scenario: Host cancels open queue
- **WHEN** Player A clicks `[Cancel Lobby]` on their active queue
- **THEN** system updates match queue status to `CANCELLED` and updates the message to indicate the lobby was cancelled.

#### Scenario: Non-host attempts to cancel queue
- **WHEN** Player B clicks `[Cancel Lobby]` on Player A's queue
- **THEN** system responds with an ephemeral error stating only the host can cancel the lobby.

### Requirement: Open Queue Expiration
The system SHALL mark any open queue older than 300 seconds as expired upon interaction.

#### Scenario: Player attempts to join expired queue
- **WHEN** Player B clicks `[Join Match]` more than 300 seconds after creation
- **THEN** system marks queue status as `EXPIRED` and responds with an ephemeral error indicating the lobby has expired.

