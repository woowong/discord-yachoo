## MODIFIED Requirements

### Requirement: Single-Message 3-Stage Dramatic Highlight Broadcast
The system SHALL orchestrate the duel simulation in background and sequentially update a single Discord message embed across multiple dramatic acts within the Cloudflare Worker 30-second `waitUntil` execution budget, rendering the animated rolling GIF, complete ASCII category scoreboard, current roll dice emojis, hold locks, dopamine gauges, and spicy in-character trash talk without timing out or flooding the channel.

#### Scenario: Wagering window ends and duel begins
- **WHEN** the betting phase concludes and the duel starts
- **THEN** system executes the simulation, then updates the message embed through 4 major acts (Act 1: R03 Opening, Act 2: R06 Upper Bonus Clash, Act 3: R09 Clutch Gamble, Act 4: R12 Final Showdown), presenting each act in two phases: first, an animated dice rolling suspense frame with GIF for ~2.0s, followed by the dice impact and updated ASCII scoreboard with dopamine dialogues (Acts 1-3: ~2.5s, Act 4: ~1.5s), keeping the total execution time comfortably within ~22s before concluding with the final result and Elo payout settlement.
