# flywire-yacht-sensory-motor Specification

## Purpose
Translates Yacht game state into biological sensory neuron stimulations and converts Mushroom Body output spikes into valid game actions (dice hold masks and category selections).

## Requirements

### Requirement: Yacht Game State Sensory Encoding
The system SHALL encode current dice rolls (5 dice), roll count (0..2), and category availability into external current vectors for input Projection Neurons (PNs).

#### Scenario: Encoding dice and turn state
- **WHEN** a turn state with current dice `[3, 3, 4, 5, 6]`, roll count 1, and 8 remaining categories is provided
- **THEN** the encoder produces an injection vector activating corresponding sensory neurons without index out-of-bounds.

### Requirement: Rolling Decision Decoding (Hold/Reroll Mask)
The system SHALL map output MBON firing activity during rolling phases into a 5-element boolean hold mask.

#### Scenario: Decoding hold mask from spikes
- **WHEN** the SNN emits motor spikes during a rolling phase
- **THEN** the decoder returns a valid `DiceHold` tuple of 5 booleans indicating which dice to keep.

### Requirement: Category Selection Decoding
The system SHALL map output MBON firing counts into exactly one valid and currently available scoring category.

#### Scenario: Selecting available category
- **WHEN** the scoring phase occurs and the agent's highest firing output neuron corresponds to an already-used category
- **THEN** the decoder falls back to the next highest firing available category, never selecting a previously filled category.
