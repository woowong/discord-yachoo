# flywire-island-evolution Delta Specification

## MODIFIED Requirements

### Requirement: Multi-Island Population Architecture
The system SHALL maintain multiple isolated sub-populations (islands) distributed across all available CPU cores (e.g. 10 parallel workers on Apple M4) to train scaled connectome weights concurrently with distinct evolutionary pressures.

#### Scenario: Evaluating distinct islands
- **WHEN** running island model evolution
- **THEN** each island evaluates its population under its specific fitness configuration (e.g. Jackpot Hunter vs. Upper Bonus Specialist)

#### Scenario: Multi-core parallel island evaluation
- **WHEN** island neuroevolution is initiated on an M4 multi-core machine
- **THEN** the system distributes island evaluations across 10 parallel processes, tracking generation progress and elite fitness without CPU starvation.
