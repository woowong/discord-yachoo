## Purpose

Provides sensory affordance potential score injection into projection neurons and multi-pair pattern preservation during rolling phases.

## ADDED Requirements

### Requirement: Prospective Score Affordance Injection
The system SHALL inject continuous prospective score signals into projection neurons PN 33..44 corresponding to each available category for the current dice combination.

#### Scenario: Injecting affordance current
- **WHEN** encoding the current board state into PNs
- **THEN** each available category neuron receives an input current proportional to the exact points it would yield ($Points / 50.0 \times \text{amplitude}$)

### Requirement: Multi-Pair and Near-Yacht Rolling Preservation
The system SHALL preserve all components of two-pair and four-of-a-kind dice configurations during reroll phases to maximize Full House and Yacht formation probabilities.

#### Scenario: Handling two-pair configuration
- **WHEN** the agent rolls a two-pair combination (e.g. 3, 3, 5, 5, 2) and selects a pattern-seeking drive
- **THEN** both pairs (3, 3 and 5, 5) are held, and only the single remaining die is rerolled

### Requirement: Non-Zero Category Action Filtering
The system SHALL prevent selecting categories that yield 0 points when alternative positive-scoring categories remain available.

#### Scenario: Filtering zero-yield categories
- **WHEN** selecting a category in the scoring phase
- **THEN** available categories with prospective points > 0 are prioritized over zero-point categories
