## ADDED Requirements

### Requirement: Challenge Invitation Creation
When a player challenges a specific opponent, the system SHALL create a pending invitation with a 5-minute (300 seconds) expiration instead of immediately starting an active game.

#### Scenario: Creating a direct challenge invitation
- **WHEN** Player A runs `/challenge @PlayerB`
- **THEN** system saves an invitation record with status `PENDING` and renders an invitation card message with `[Accept]` and `[Decline]` buttons.

### Requirement: Challenge Invitation Acceptance
The system SHALL verify that only the targeted opponent can accept the invitation, and if accepted within 5 minutes, transition the invitation status to `ACCEPTED` and start an active 2-player game.

#### Scenario: Opponent accepts challenge within 5 minutes
- **WHEN** Player B clicks `[Accept]` on a pending invitation targeted to Player B within 300 seconds of creation
- **THEN** system updates invitation status to `ACCEPTED` and initializes an active 2-player `GameState`.

#### Scenario: Unauthorized player attempts to accept
- **WHEN** Player C (who is not the targeted opponent) clicks `[Accept]`
- **THEN** system responds with an ephemeral error message stating that only the challenged opponent may accept.

### Requirement: Challenge Invitation Decline
The system SHALL allow the targeted opponent to decline the challenge invitation.

#### Scenario: Opponent declines challenge
- **WHEN** Player B clicks `[Decline]`
- **THEN** system updates invitation status to `DECLINED` and updates the message to indicate the invitation was declined.

### Requirement: Challenge Invitation Expiration
The system SHALL consider any invitation older than 300 seconds as expired upon any interaction.

#### Scenario: Opponent clicks accept after expiration
- **WHEN** Player B clicks `[Accept]` more than 300 seconds after invitation creation
- **THEN** system marks invitation status as `EXPIRED` and responds with an ephemeral message stating the invitation has expired.
