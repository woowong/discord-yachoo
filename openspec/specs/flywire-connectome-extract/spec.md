# flywire-connectome-extract Specification

## Purpose
Provides connectivity to the FlyWire Codex/CAVE infrastructure to query and extract Drosophila synaptic subcircuits (specifically Mushroom Body circuits) and cache them as local matrix artifacts for downstream simulation.

## Requirements

### Requirement: FlyWire CAVE Authentication and Client Initialization
The system SHALL initialize the CAVEclient for the Drosophila melanogaster FAFB dataset using user-provided API credentials.

#### Scenario: Successful client initialization with valid token
- **WHEN** a valid FlyWire CAVE auth token is provided via environment or credentials file
- **THEN** the client connects to the FAFB v783 dataset without authentication error.

#### Scenario: Authentication failure handling
- **WHEN** the auth token is missing or invalid
- **THEN** the system aborts gracefully with an explicit error message prompting for CAVE token configuration.

### Requirement: Mushroom Body Subcircuit Query and Extraction
The system SHALL query or synthesize scalable Drosophila neural subcircuits comprising bilateral Mushroom Bodies (left and right hemispheres), Central Complex motor relay centers, and sensory input clusters scaling up to 10,000–30,000+ neurons with 3D spatial coordinate annotations.

#### Scenario: Querying synaptic graph by cell types
- **WHEN** the extraction pipeline requests the Mushroom Body subcircuit
- **THEN** the system returns a directed graph of pre-synaptic and post-synaptic neuron IDs with synapse counts.

#### Scenario: Querying or generating scaled multi-region connectome
- **WHEN** the extraction pipeline is invoked with a scaled topology target (e.g. `--num-kc 10000` or `--bilateral`)
- **THEN** the system generates a directed sparse adjacency graph of pre-synaptic and post-synaptic neurons with biologically normalized connection densities and 3D spatial coordinates for each neuron.

### Requirement: Local Synaptic Graph Export and Caching
The system SHALL serialize and save the extracted scaled subcircuit into a compact local format including 3D spatial coordinates, layer/region bounds, and synaptic weights.

#### Scenario: Caching extracted graph to disk
- **WHEN** extraction completes successfully
- **THEN** an adjacency matrix and neuron metadata mapping file are written to the local cache directory, enabling offline execution.

#### Scenario: Caching scaled 3D connectome to disk
- **WHEN** scaled extraction completes successfully
- **THEN** an adjacency matrix (`mb_scaled_adj.npz`) and 3D neuron metadata mapping file (`mb_scaled_meta.json`) are written to the local cache directory, ready for offline simulation and WebGL rendering.
