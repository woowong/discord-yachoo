## MODIFIED Requirements

### Requirement: Discord Game Interaction Handling
The system SHALL handle component interactions for gameplay and surrender. A player clicking surrender MUST first receive an ephemeral confirmation. For a single-player game, confirming surrender MAY finish the game immediately. For a multiplayer game, confirming surrender MUST create a pending surrender proposal for the confirming player and send the opponent an accept/decline interaction.

When a multiplayer surrender proposal is accepted, the orchestrator MUST use the proposer recorded in the current persisted game state as the surrendering player. The accepting user's ID MUST never be used as a fallback surrendering ID. The orchestrator MUST persist the resulting finished match, update winner/loss/ELO statistics, and update the main game board consistently with the proposer being the loser.

#### Scenario: Confirming surrender in multiplayer
- **WHEN** player 1 confirms surrender in an active multiplayer game
- **THEN** the system MUST preserve the current turn state, record player 1 as the pending proposer, and send the opponent an accept/decline interaction without finishing the game yet

#### Scenario: Opponent accepts a valid surrender proposal
- **WHEN** player 2, the designated opponent, accepts player 1's still-pending surrender proposal
- **THEN** the system MUST finish the game with player 1 in `surrenderedId`, record player 2 as the winner, update match statistics and ELO accordingly, and remove the active game

#### Scenario: Stale acceptance does not surrender the accepting player
- **WHEN** player 2 accepts an interaction whose proposal has already been cleared by a normal turn action
- **THEN** the system MUST return an ephemeral invalid-or-expired-proposal response, MUST NOT finish the game, and MUST NOT write player 2 as `surrenderedId`

#### Scenario: Current turn does not control surrender proposal eligibility
- **WHEN** either active player clicks surrender while it is the other player's turn or while the game is in a scoring phase
- **THEN** the system MUST allow the proposal flow without changing the current player or treating the current player as the surrendering player

### Requirement: Discord Handlers for Surrender Proposal and Acceptance
The Discord interaction parser and game orchestrator SHALL process surrender proposals, acceptances, and declines through dedicated component interactions. Accept and decline actions MUST be authorized against the current game state: only the opponent of the recorded proposer may respond, and a missing or cleared proposal MUST be treated as expired. Unauthorized and expired responses MUST be ephemeral and MUST NOT mutate the game.

#### Scenario: Sending surrender proposal message
- **WHEN** a player confirms a surrender proposal in a multiplayer game
- **THEN** the system MUST send a message containing accept and decline controls addressed to the opponent, while retaining the proposer identity in the persisted game state

#### Scenario: Unauthorized user clicks accept or decline button
- **WHEN** the proposer or a user who is not the designated opponent attempts to click the accept or decline button
- **THEN** the system MUST return an ephemeral warning and MUST NOT change the game state

#### Scenario: Expired or cleared proposal button is clicked
- **WHEN** any user clicks an accept or decline button after `pendingSurrenderOfferByPlayerId` has been cleared
- **THEN** the system MUST return an ephemeral expired-proposal response and MUST NOT finish, surrender, or otherwise mutate the game
