# flywire-synaptic-plasticity Specification

## Purpose
Provides biologically plausible synaptic plasticity and neuroevolution for Drosophila Mushroom Body SNN agents playing Yacht.

## Requirements

### Requirement: Selective KC-to-MBON Synaptic Plasticity
The system SHALL preserve fixed PN-to-KC and APL inhibitory connections while allowing synaptic weights between Kenyon Cells (KC) and Mushroom Body Output Neurons (MBON) to be mutated and optimized.

#### Scenario: Mutating synaptic weights
- **WHEN** applying neuroevolutionary mutation to an individual agent
- **THEN** only existing non-zero KC-to-MBON synaptic weights are perturbed by Gaussian noise, and PN-to-KC connections remain unchanged

### Requirement: Population-Based Neuroevolution
The system SHALL support generation-based neuroevolution over a population of connectome agents, selecting top-performing agents based on average game score.

#### Scenario: Running one generation of tournament selection
- **WHEN** a generation of N connectome agents completes their evaluation games
- **THEN** agents are ranked by total average score, the top fraction is retained, and offspring are created via mutation and crossover for the next generation

### Requirement: Neuromodulatory Reward Bias
The system SHALL support reward shaping configurations that modulate synaptic fitness based on specific outcomes (e.g. Yacht jackpot bonus vs. zero-score penalty).

#### Scenario: Applying dopamine-like jackpot reward bias
- **WHEN** an agent scores a high-tier category such as Yacht or Large Straight
- **THEN** an elevated fitness multiplier is awarded to that agent's evaluation
