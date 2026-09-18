# flywire-realtime-web-visualizer Specification

## Purpose
Provides a real-time web visualizer and streaming server to observe Drosophila connectome SNN neural spike activity and Yacht decision making across local and Tailscale networks.

## Requirements

### Requirement: Tailscale Remote Access and Web Server Binding
The system SHALL bind a lightweight HTTP server to `0.0.0.0:<port>` (default 8765) to permit real-time dashboard access via localhost and Tailscale private network addresses (`100.85.188.7`).

#### Scenario: Accessing dashboard from local or Tailscale remote browser
- **WHEN** a user navigates to `http://localhost:8765` or `http://100.85.188.7:8765`
- **THEN** the web server serves the real-time connectome visualizer UI, styles, and client scripts with zero external npm/pip dependencies.

### Requirement: Live Connectome Spiking and State API
The system SHALL provide HTTP API endpoints (`/api/status`, `/api/step`, `/api/reset`, `/api/topology`) exposing game-level state, 3D anatomical coordinates, and time-resolved spike traces across the scaled connectome topology.

#### Scenario: Stepping a game turn with neural trace
- **WHEN** client issues `POST /api/step`
- **THEN** system runs one game round using the trained connectome agent and returns dice rolls, hold actions, chosen category, score update, and time-resolved spike vectors for PNs, KCs, APL, and MBONs.

#### Scenario: Fetching 3D topology and stepping simulation
- **WHEN** the client requests `/api/topology` followed by `POST /api/step`
- **THEN** the server returns 3D neuron coordinates, region clustering, and millisecond spike activation indices for rendering on the 3D visualizer canvas.

### Requirement: Interactive Real-Time Connectome Canvas Visualization
The web dashboard SHALL render a 3D volumetric visualization of the Drosophila brain using Three.js / WebGL, providing 360-degree orbit camera controls, glowing bloom effects for active neurons, and dynamic synaptic signal flow animations.

#### Scenario: Visualizing neural decision cascade
- **WHEN** sensory dice input enters the SNN
- **THEN** the canvas animates PN inputs lighting up, signals cascading into Kenyon Cells, APL inhibitory wave propagation, and selective firing of MBON action drivers.

#### Scenario: Interactive 3D exploration and neural spike animation
- **WHEN** the user interacts with the 3D dashboard during a Yacht turn
- **THEN** the camera allows free 3D rotation/zoom, and sensory dice inputs trigger glowing 3D cascades through the bilateral lobes and output pathways at 60 FPS.

### Requirement: Spectator Event Stream (SSE)
The system SHALL provide a Server-Sent Events (`/events`) stream broadcasting live game progress and neural activations to support passive spectators and future Discord match relays.

#### Scenario: Streaming live matches to connected spectators
- **WHEN** an event-stream client subscribes to `/events` and a game turn is processed
- **THEN** the server pushes structured turn events including dice states and neural telemetry in real time.
