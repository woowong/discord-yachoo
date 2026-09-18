## Purpose

Loads an offline Drosophila synaptic subcircuit graph into a local Spiking Neural Network (LIF model) and executes forward spike propagation to verify signal delivery from sensory input to motor output without learning.

## ADDED Requirements

### Requirement: Local Synaptic Graph Loader
The system SHALL load the cached synaptic adjacency matrix and neuron index mappings into memory.

#### Scenario: Loading valid cached matrix
- **WHEN** the simulation pipeline specifies a valid cached graph file
- **THEN** the synaptic weight matrix and neuron type definitions are loaded into an in-memory sparse representation.

### Requirement: Leaky Integrate-and-Fire (LIF) Forward Step Simulation
The system SHALL simulate membrane potential integration, decay, and threshold-based spike generation across discrete simulation time steps.

#### Scenario: Subthreshold membrane decay
- **WHEN** no input current or spikes are injected into a neuron over successive time steps
- **THEN** its membrane potential decays exponentially towards the resting potential.

#### Scenario: Action potential generation and propagation
- **WHEN** incoming synaptic current pushes the membrane potential above threshold
- **THEN** the neuron emits a spike at time t and transmits synaptic current to its downstream targets at time t+1, then enters a refractory/reset state.

### Requirement: Sensory Stimulation to Motor Spike Verification
The system SHALL verify that injecting current into input (sensory) neurons produces measurable spike activity in designated output (MBON / motor) neurons.

#### Scenario: End-to-end forward propagation
- **WHEN** a pulse of input spikes is fed into input neurons
- **THEN** the simulation records non-zero spike activity in downstream interneurons and output neurons, producing a signal trace log.
