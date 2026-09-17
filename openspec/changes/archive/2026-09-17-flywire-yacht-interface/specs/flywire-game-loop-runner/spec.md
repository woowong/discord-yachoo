## Purpose

Executes autonomous single-player Yacht games using the Fly SNN agent, validating full 12-round game completion and recording turn-by-turn action and score metrics.

## ADDED Requirements

### Requirement: Autonomous 12-Round Game Completion
The system SHALL run a complete 12-round Yacht game loop driven exclusively by the Fly SNN agent without human intervention or infinite loops.

#### Scenario: Full game completion without illegal moves
- **WHEN** the game runner starts an autonomous session with the Fly SNN agent
- **THEN** all 12 score categories are filled exactly once and the game terminates with a valid non-negative total score.

### Requirement: Performance and Score Logging
The system SHALL record turn history, upper bonus eligibility (>= 63), and total scores for each autonomous game session.

#### Scenario: Benchmark execution against random agent baseline
- **WHEN** the benchmark runner runs 20 consecutive autonomous games
- **THEN** it outputs average score, standard deviation, and completion rate comparison between the Fly SNN agent and a random baseline agent.
