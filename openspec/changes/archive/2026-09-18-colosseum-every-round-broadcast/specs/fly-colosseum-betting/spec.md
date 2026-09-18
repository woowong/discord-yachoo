## MODIFIED Requirements

### Requirement: Single-Message 3-Stage Dramatic Highlight Broadcast
The system SHALL orchestrate the duel simulation in background and sequentially update a single Discord message embed through every individual round (Round 1 through 12) without skipping turns, within the Cloudflare Worker 30-second `waitUntil` execution budget, rendering the animated rolling GIF opening, full ASCII category scoreboard dynamically populated round by round, current roll dice emojis, hold locks, dopamine gauges, and spicy in-character trash talk without timing out or flooding the channel.

#### Scenario: Wagering window ends and duel begins
- **WHEN** the betting phase concludes and the duel starts
- **THEN** system executes the simulation, then updates the message embed with an opening cup-shaking suspense frame (~1.5s), followed sequentially by all 12 rounds (Round 1 through Round 12, ~1.2s delay per round) displaying each player's rolled dice, holds, selected category score, trash-talk dialogue, and updated ASCII board, before concluding with the final result and Elo payout settlement frame (~21.5s total execution).
