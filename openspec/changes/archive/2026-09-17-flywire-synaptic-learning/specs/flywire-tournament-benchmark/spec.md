## Purpose

Provides tournament-level benchmarking across generations, topology comparisons, and detailed behavioral activity reporting for fly connectome agents.

## ADDED Requirements

### Requirement: Cross-Generation Performance Tracking
The system SHALL log and report generation-by-generation metrics including mean score, maximum score, upper-section bonus rate, and duration.

#### Scenario: Evaluating generational progress
- **WHEN** running neuroevolution for G generations
- **THEN** a summary report is emitted detailing the trajectory of mean and peak game scores across all generations

### Requirement: Topology Comparative Benchmark
The system SHALL benchmark performance across three distinct network architectures: biological Drosophila connectome, random Erdős–Rényi SNN, and standard artificial MLP.

#### Scenario: Comparing connectome against random topology
- **WHEN** evaluating biological topology against random topology under identical parameter budgets
- **THEN** comparative metrics including convergence speed, score distribution, and upper-bonus attainment are computed and output

### Requirement: Behavioral Phenotype Profiling
The system SHALL track decision-making phenotypes including hold preferences, risk-seeking ratios, and category allocation profiles for champion agents.

#### Scenario: Profiling champion fly decision habits
- **WHEN** the champion agent finishes 20 benchmark games
- **THEN** the system outputs a breakdown of favorite held dice faces and distribution of scored categories
