# flywire-island-evolution Specification

## Purpose
Provides multi-deme island model neuroevolution with speciation, adaptive hypermutation, and cross-island migration for Yacht connectome agents.

## Requirements

### Requirement: Multi-Island Population Architecture
The system SHALL maintain multiple isolated sub-populations (islands) distributed across all available CPU cores (e.g. 10 parallel workers on Apple M4) to train scaled connectome weights concurrently with distinct evolutionary pressures.

#### Scenario: Evaluating distinct islands
- **WHEN** running island model evolution
- **THEN** each island evaluates its population under its specific fitness configuration (e.g. Jackpot Hunter vs. Upper Bonus Specialist)

#### Scenario: Multi-core parallel island evaluation
- **WHEN** island neuroevolution is initiated on an M4 multi-core machine
- **THEN** the system distributes island evaluations across 10 parallel processes, tracking generation progress and elite fitness without CPU starvation.

### Requirement: Adaptive Hypermutation on Stagnation
The system SHALL automatically increase mutation variance $\sigma$ when an island's top fitness fails to improve over consecutive generations.

#### Scenario: Triggering hypermutation
- **WHEN** an island's best fitness does not improve for 5 consecutive generations
- **THEN** mutation sigma is temporarily increased to escape local optima

### Requirement: Cross-Island Migration and Hybrid Crossover
The system SHALL exchange top-performing individuals between islands at regular generational intervals.

#### Scenario: Performing migration interval
- **WHEN** every M generations elapse
- **THEN** the top champions from each island migrate and cross over with champions of neighboring islands
