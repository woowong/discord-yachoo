# flywire-island-evolution Specification

## Purpose
Provides multi-deme island model neuroevolution with speciation, adaptive hypermutation, and cross-island migration for Yacht connectome agents.

## Requirements

### Requirement: Multi-Island Population Architecture
The system SHALL maintain multiple isolated sub-populations (islands) with distinct selective pressures and mutation hyperparameters.

#### Scenario: Evaluating distinct islands
- **WHEN** running island model evolution
- **THEN** each island evaluates its population under its specific fitness configuration (e.g. Jackpot Hunter vs. Upper Bonus Specialist)

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
