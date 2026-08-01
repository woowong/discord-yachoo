## MODIFIED Requirements

### Requirement: Surrender Proposal and Acceptance
The system SHALL support proposing a surrender and allowing only the proposing player's opponent to accept or decline the proposal. A surrender proposal SHALL be independent of the current turn: any active player may propose it during any non-finished game state, regardless of `currentPlayerIndex`, roll count, or whether the game is currently rolling or scoring. Creating a proposal MUST preserve the current turn, dice, roll count, and score state while recording the proposing player's ID as `pendingSurrenderOfferByPlayerId`.

If the opponent accepts a still-pending proposal, the game MUST transition to 'Finished' with `surrenderedPlayerId` set to the recorded proposer, never to the accepting player. If there is no pending proposal, if the proposal was cleared by another action, or if the responder is not the opponent, the acceptance MUST fail without changing game state. If the opponent declines a still-pending proposal, the pending proposer ID MUST be cleared and the game MUST continue.

Any normal turn action (dice roll or category selection) SHALL clear the pending surrender offer. Clearing an offer MUST invalidate previously rendered accept and decline interactions.

#### Scenario: Proposing surrender without changing the current turn
- **WHEN** player 1 proposes surrender while player 2 is the current player, or while the game is in the scoring phase
- **THEN** the system MUST record player 1 as `pendingSurrenderOfferByPlayerId` while preserving the current player, dice, roll count, score state, and non-finished status

#### Scenario: Opponent accepts surrender proposal
- **WHEN** player 2, the opponent of player 1, accepts a still-pending proposal made by player 1
- **THEN** the system MUST transition the game to 'Finished', set `surrenderedPlayerId` to player 1, and declare player 2 the winner

#### Scenario: Acceptance never transfers surrender to the responder
- **WHEN** player 2 accepts a proposal whose recorded proposer is player 1
- **THEN** the system MUST record player 1 as the surrendered player even when player 2 is the current player or has a different turn state

#### Scenario: Proposer attempts to accept their own proposal
- **WHEN** player 1 attempts to accept their own pending surrender proposal
- **THEN** the system MUST reject the action and leave the game state unchanged

#### Scenario: Non-participant attempts to accept a proposal
- **WHEN** a user who is not player 1 or player 2 attempts to accept player 1's pending surrender proposal
- **THEN** the system MUST reject the action and leave the game state unchanged

#### Scenario: Stale acceptance after the proposal was cleared
- **WHEN** player 2 clicks an accept interaction after a normal turn action has cleared player 1's pending surrender proposal
- **THEN** the system MUST reject the stale interaction, leave the active game unfinished, and MUST NOT record player 2 as surrendered

#### Scenario: Opponent declines surrender proposal
- **WHEN** player 2 declines the still-pending surrender proposal made by player 1
- **THEN** `pendingSurrenderOfferByPlayerId` MUST be cleared and the game MUST continue with all other turn state unchanged

#### Scenario: Turn action auto-clears pending surrender offer
- **WHEN** a player executes a dice roll or score category selection while `pendingSurrenderOfferByPlayerId` is set
- **THEN** `pendingSurrenderOfferByPlayerId` MUST be cleared before performing the turn action, and any later response to the old proposal MUST be rejected
