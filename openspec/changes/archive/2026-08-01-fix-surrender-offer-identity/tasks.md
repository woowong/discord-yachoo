## 1. Domain State Transition

- [x] 1.1 Update surrender proposal/acceptance transitions so the persisted proposer is the only possible `surrenderedPlayerId`, with no responder fallback.
- [x] 1.2 Reject acceptance and decline when no pending proposal exists, when the proposer responds to their own offer, or when the responder is not a game participant/opponent.
- [x] 1.3 Preserve current player, dice, roll count, score state, and game phase when creating a surrender proposal.

## 2. Application Workflow

- [x] 2.1 Refactor `GameWorkflowService` multiplayer acceptance to use the validated domain acceptance transition and pass the recorded proposer explicitly to common game-end processing.
- [x] 2.2 Ensure invalid or stale acceptance/decline requests stop before active-game deletion, match persistence, statistics, ELO updates, or Discord completion notifications.
- [x] 2.3 Keep single-player confirmed surrender behavior unchanged while limiting the identity fix to the multiplayer offer flow.

## 3. Discord Interaction Authorization

- [x] 3.1 Validate accept/decline interactions against the latest game state so only the opponent of the recorded proposer may respond.
- [x] 3.2 Return ephemeral invalid/expired-proposal feedback for unauthorized, missing, or cleared proposals without updating the game board.
- [x] 3.3 Preserve the existing ephemeral initial confirmation and existing offer message visibility while ensuring stale component buttons cannot finish a game.

## 4. Tests

- [x] 4.1 Add domain tests for proposer-independent-of-turn behavior, scoring-phase proposals, proposer/self rejection, non-participant rejection, and stale acceptance.
- [x] 4.2 Add integration tests for A proposing and B accepting, asserting `surrenderedId = A`, `winnerId = B`, active-game deletion, match/statistics/ELO updates, and finished-board rendering.
- [x] 4.3 Add integration tests proving a cleared proposal cannot make B surrender and unauthorized users cannot accept or decline.

## 5. Verification

- [x] 5.1 Run the complete Vitest suite and confirm existing single-player surrender and general gameplay tests still pass.
- [x] 5.2 Run `openspec validate --changes "fix-surrender-offer-identity" --strict` and review the final change status before implementation.
