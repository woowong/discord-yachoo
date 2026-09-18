# fly-colosseum-betting Specification

## Purpose
디스코드 환경에서 개성 있는 4종 초파리 검투사 간의 1:1 결투를 관전하고, 유저가 자신의 ELO를 베팅하여 승패에 따라 배당금을 정산받는 콜로세움 시스템을 제공한다.

## Requirements

### Requirement: Colosseum Match Creation and Wagering Phase
The system SHALL support creating a spectator match between two distinct, randomly selected fly personas via the `/colosseum` slash command and host an active wagering phase with calculated odds.

#### Scenario: User initiates colosseum duel
- **WHEN** a user invokes `/colosseum` in a Discord channel
- **THEN** system randomly selects two different fly personas from the 4 gladiators (Jackpot, Newton, Speeder, Chimera), calculates win expectancy and odds based on their historical Elo, initializes a 30-second wagering window, and displays betting buttons (`[🔴 Persona A +20 ELO]`, `[🔵 Persona B +20 ELO]`).

### Requirement: User Elo Wagering and Safeguards
The system SHALL permit server members to place wagers using their own persistent Elo rating within safe boundaries.

#### Scenario: User places valid Elo bet
- **WHEN** user clicks a betting button with valid amount (10 to 50 Elo) and current Elo > 800
- **THEN** system registers the bet in the active match pool and updates the embed with current pool status and potential payout.

#### Scenario: User has insufficient Elo or below safety floor
- **WHEN** user with Elo <= 800 attempts to place an Elo bet
- **THEN** system rejects the wager with an ephemeral message explaining the 800 Elo bankruptcy protection rule.

### Requirement: Single-Message 3-Stage Dramatic Highlight Broadcast
The system SHALL orchestrate the duel simulation in background and update the single Discord message embed across 3 distinct phases showing dopamine levels and in-character dialogues without flooding the channel.

#### Scenario: Wagering window ends and duel begins
- **WHEN** the 30-second wagering timer expires or bet phase concludes
- **THEN** system fetches the simulation timeline from the SNN server, updates the embed to Phase 1 (Rounds 1-6 clash summary with current leader, dopamine gauges, and fly dialogues), waits briefly, transitions to Phase 2 (Rounds 7-12 climax and dramatic lead changes), and concludes with Phase 3 (Final winner announcement and lead change count).

### Requirement: Payout Distribution and Persistence
The system SHALL settle all registered wagers according to the match outcome and persist updated Elo ratings in the database.

#### Scenario: Distributing winnings after duel conclusion
- **WHEN** the match concludes with a decisive winner
- **THEN** system credits winning bettors with their wager multiplied by the locked payout odds, deducts wagers from losing bettors, updates D1 player records, and displays the net Elo change in the final embed.

#### Scenario: Match concludes in a draw
- **WHEN** both fly personas finish with equal scores
- **THEN** system refunds all placed Elo wagers to participants with 0 net loss.
