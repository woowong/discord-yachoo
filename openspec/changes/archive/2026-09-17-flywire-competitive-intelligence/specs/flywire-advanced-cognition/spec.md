## Purpose

Enables advanced cognitive mechanisms in the fly connectome including dynamic APL inhibitory gating, short-term working memory recurrence, and expandable Kenyon Cell capacities.

## ADDED Requirements

### Requirement: Dynamic APL Inhibitory Gating
The system SHALL dynamically adjust the synaptic inhibition strength of the APL neuron depending on the decision phase (strict sparsity during exploration vs. relaxed inhibition during combinatorial decision-making).

#### Scenario: Dynamic relaxation during rerolls
- **WHEN** the agent enters the 2nd or 3rd reroll phase
- **THEN** APL feedback inhibition is modulated to a relaxed level to allow higher KC coincidence bandwidth

### Requirement: Short-Term Working Memory Recurrence
The system SHALL maintain a temporal working memory trace of prior dice and intended categories across sequential rerolls within a single turn.

#### Scenario: Preserving intention across rolls
- **WHEN** the agent transitions from roll 1 to roll 2
- **THEN** a recurrent memory activation vector is fed back into sensory projection neurons to maintain strategic persistence

### Requirement: Kenyon Cell Layer Scaling
The system SHALL support scaling the number of Kenyon Cells from 1,500 up to 3,000+ while preserving biological claw connectivity ratios.

#### Scenario: Generating scaled connectome
- **WHEN** initializing an expanded connectome subcircuit with N Kenyon Cells
- **THEN** PN-KC claw sampling and KC-MBON connectivity are proportionally scaled
