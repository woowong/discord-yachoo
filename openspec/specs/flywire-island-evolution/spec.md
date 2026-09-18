# flywire-island-evolution Specification

## Purpose
Provides multi-deme island model neuroevolution with speciation, adaptive hypermutation, and cross-island migration for Yacht connectome agents.

## Requirements

### Requirement: Multi-Island Population Architecture
The system SHALL maintain multiple isolated sub-populations (islands) with 4 specialized dopamine-conditioned habitats (Straight Hunter, Upper 63 Saver, Jackpot Predator, and Hybrid Synthesizer) and scaled connectome synaptic capacity, evaluated concurrently across CPU cores with continuous quadratic upper reward shaping $(\text{UpperSum}^2)$.

#### Scenario: Evaluating distinct islands
- **WHEN** running island model evolution
- **THEN** each island evaluates its population under its specific fitness configuration (Straight Hunter, Upper 63 Saver with quadratic shaping, Jackpot Predator, or Hybrid Synthesizer).

#### Scenario: Evaluating distinct dopamine islands
- **WHEN** running island model evolution
- **THEN** each island evaluates its population under its specific dopamine conditioning rule and fitness objective across generations, preventing premature convergence to pair-only local optima.

#### Scenario: Supporting scaled connectome synapses in island evaluation
- **WHEN** evaluating individuals in scaled subcircuit mode
- **THEN** the system simulates scaled connectomes with tens of thousands of neurons and hundreds of thousands of synapses without memory leakage or thread starvation.

#### Scenario: Multi-core parallel island evaluation
- **WHEN** island neuroevolution is initiated on an M-series multi-core machine
- **THEN** the system distributes island evaluations across 10 parallel processes, tracking generation progress and elite fitness without CPU starvation.

### Requirement: Long-Generation Evolution and Progress Reporting
The system SHALL execute deep generational neuroevolution (100~200+ generations) across parallel worker processes, logging evolutionary trajectory statistics (mean scores, max scores, straight success rates, 63-bonus rates, diversity metrics) and generating structured Notion documentation reports at periodic checkpoint intervals.

#### Scenario: Checkpoint telemetry capture during extended evolution
- **WHEN** multi-island neuroevolution progresses across multiple generations
- **THEN** generation metrics from each island and global champions are compiled into JSON history logs.

#### Scenario: Publishing evolutionary milestone reports to Notion
- **WHEN** evolution reaches designated generation checkpoints (e.g. initial baseline, intermediate milestones, and final generation)
- **THEN** the system generates a formatted Notion document summarizing champion weights, fitness curves, straight hunting capabilities, and gladiator tournament benchmark comparisons.

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
