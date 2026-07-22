## ADDED Requirements

### Requirement: Surrender Proposal and Acceptance
The system SHALL support proposing a surrender and allowing the opponent player to accept or decline the proposal. During a pending surrender offer, the game status remains 'Rolling' with `pendingSurrenderOfferByPlayerId` set to the proposer's player ID. If the opponent accepts, the game transitions to 'Finished' with `surrenderedPlayerId` recorded as the proposer. If the opponent declines, `pendingSurrenderOfferByPlayerId` is cleared and the game continues. Any normal turn action (dice roll or category selection) SHALL also clear the pending surrender offer.

#### Scenario: Proposing surrender in multiplayer game
- **WHEN** player 1 proposes a surrender in a multi-player game
- **THEN** the game state MUST set `pendingSurrenderOfferByPlayerId` to player 1's ID while preserving current game state

#### Scenario: Opponent accepts surrender proposal
- **WHEN** player 2 (opponent) accepts the surrender proposed by player 1
- **THEN** the game status MUST immediately become 'Finished' with `surrenderedPlayerId` set to player 1's ID

#### Scenario: Opponent declines surrender proposal
- **WHEN** player 2 (opponent) declines the surrender proposed by player 1
- **THEN** `pendingSurrenderOfferByPlayerId` MUST be cleared and the game MUST continue seamlessly

#### Scenario: Turn action auto-clears pending surrender offer
- **WHEN** a player executes a dice roll or score category selection while `pendingSurrenderOfferByPlayerId` is set
- **THEN** `pendingSurrenderOfferByPlayerId` MUST be cleared before performing the turn action
