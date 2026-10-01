## MODIFIED Requirements

### Requirement: Single-Message 3-Stage Dramatic Highlight Broadcast
The system SHALL orchestrate the duel simulation and sequentially broadcast every individual roll (Roll 1, Roll 2, Roll 3, Hold selection, Category locking) for both fly personas across all 12 rounds to a single Discord message embed with generous turn delays (1.2s~1.5s), rendering dice emojis, hold locks, dynamic ASCII scoreboards, dopamine gauges, and spicy in-character dialogues without hitting Discord rate limits or Cloudflare Worker execution timeouts.

#### Scenario: Wagering window ends and duel begins
- **WHEN** the betting phase concludes and the duel starts
- **THEN** system delegates the live broadcast to the persistent Python SNN broadcast worker, which streams all 12 rounds turn-by-turn (Fly A rolls 1-3 with lock decisions -> Fly A category lock -> Fly B rolls 1-3 with lock decisions -> Fly B category lock -> round scoreboard update) over 2~3 minutes, before triggering final match settlement and Elo payout. If Python server is unreachable, system gracefully falls back to the Worker-side fast round summary.
