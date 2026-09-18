# flywire-island-evolution Specification

## Purpose
Provides multi-deme island model neuroevolution with speciation, adaptive hypermutation, and cross-island migration for Yacht connectome agents.

## Requirements

### Requirement: Multi-Island Population Architecture
The system SHALL maintain multiple isolated sub-populations (islands) with distinct dopamine-conditioned habitats (Satiety-Gated, Affordance RPE, Dynamic APL Attention, and Pure SNN Control) and scaled connectome synaptic capacity, evaluated concurrently across CPU cores.

#### Scenario: Evaluating distinct islands
- **WHEN** running island model evolution
- **THEN** each island evaluates its population under its specific fitness configuration (e.g. Jackpot Hunter vs. Upper Bonus Specialist)

#### Scenario: Evaluating distinct dopamine islands
- **WHEN** running island model evolution
- **THEN** each island evaluates its population under its specific dopamine conditioning rule and fitness objective across generations.

#### Scenario: Supporting scaled connectome synapses in island evaluation
- **WHEN** evaluating individuals in scaled subcircuit mode
- **THEN** the system simulates scaled connectomes with tens of thousands of neurons and hundreds of thousands of synapses without memory leakage or thread starvation.

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

### Requirement: Connectome Scaffold Freezing & Local Plasticity Compatibility
The system SHALL support the frozen scaffold local plasticity paradigm, where global non-MB connectome topology (up to hundreds of thousands of neurons including adult male connectome scale) remains invariant while synaptic mutation/crossover is isolated strictly to designated KC-MBON and neuromodulatory compartments.

#### Scenario: Preserving frozen non-MB scaffold
- **WHEN** mutating or crossing over genomes in scaled connectome mode
- **THEN** only KC-to-MBON synaptic weights are updated, while PN->KC, central complex, APL, and other biological connections remain strictly preserved.
