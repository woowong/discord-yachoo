## Purpose

Provides competitive head-to-head 1v1 Yacht duels between two fly connectome agents with win/loss dopamine reward modulation and Elo rating tracking.

## ADDED Requirements

### Requirement: 1v1 Yacht Head-to-Head Duel Simulation
The system SHALL support 2-player alternating turn Yacht matches between two fly agents with score comparisons and winner determination.

#### Scenario: Running a 1v1 match between Fly A and Fly B
- **WHEN** Fly A and Fly B play a 12-round Yacht duel
- **THEN** both agents take alternate turns, cumulative scores are tracked, and the agent with higher total score is declared the winner

### Requirement: Victory-Driven Neuromodulatory Plasticity
The system SHALL award elevated dopamine reward multipliers to the winning agent and apply defeat penalties to the losing agent during co-evolutionary selection.

#### Scenario: Applying PvP win/loss fitness modulation
- **WHEN** an agent wins a head-to-head match against another agent
- **THEN** its fitness is updated with a victory bonus, and its opponent receives a defeat adjustment

### Requirement: Gladiator Elo Rating Tracking
The system SHALL maintain and update Elo ratings for connectome agents participating in PvP tournaments.

#### Scenario: Updating Elo rating after match
- **WHEN** a match completes between two rated agents
- **THEN** their Elo ratings are updated based on match outcome and initial rating differences
