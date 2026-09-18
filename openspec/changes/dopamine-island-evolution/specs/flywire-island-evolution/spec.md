## MODIFIED Requirements

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
