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
The system SHALL query synaptic connections between Kenyon Cells (KC) and Mushroom Body Output Neurons (MBON) from the FAFB dataset.

#### Scenario: Querying synaptic graph by cell types
- **WHEN** the extraction pipeline requests the Mushroom Body subcircuit
- **THEN** the system returns a directed graph of pre-synaptic and post-synaptic neuron IDs with synapse counts.

### Requirement: Local Synaptic Graph Export and Caching
The system SHALL serialize and save the extracted subcircuit into a compact local format (e.g. npz sparse matrix or JSON).

#### Scenario: Caching extracted graph to disk
- **WHEN** extraction completes successfully
- **THEN** an adjacency matrix and neuron metadata mapping file are written to the local cache directory, enabling offline execution.
