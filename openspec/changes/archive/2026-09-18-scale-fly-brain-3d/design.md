# Technical Design: Scaled Drosophila Connectome & 3D WebGL Visualization

## Context

The existing connectome PoC uses a 1,575-neuron single-hemisphere Mushroom Body subcircuit running on SciPy CSR sparse matrices and rendered in 2D HTML5 Canvas. The host environment is an Apple M4 with 10 physical cores and 32 GB RAM (94% free memory). SNN benchmark tests on this machine demonstrated that a 30,000-neuron sparse LIF forward pass takes ~0.61 ms. 

## Goals / Non-Goals

**Goals:**
- Scale the connectome to a target of 12,000–30,000 neurons featuring bilateral Mushroom Bodies (left & right Calyx and lobes), Central Complex (Protocerebral Bridge & Ellipsoid Body), and Antennal Lobe sensory projections with biologically inspired 3D coordinates.
- Replace the 2D Canvas with Three.js WebGL rendering featuring orbit camera control, glowing point cloud shaders for neurons, and dynamic synaptic signal flow arcs.
- Utilize all 10 M4 CPU cores via Python `multiprocessing` to run 10 parallel evolutionary islands for fast retraining (~10–15 minutes).
- Stream 3D coordinates, spike activation indices, and Yacht game actions through the existing lightweight HTTP and SSE server (`web_server.py`).

**Non-Goals:**
- Full 139,255 whole-brain FAFB loading in raw uncompressed form during browser rendering (would require streaming 50M lines over WebGL which drops frame rates). Instead, we employ representative multi-neuropil scaling (12k–30k) and render active firing synapses dynamically.
- Replacing the Yacht game domain logic in TypeScript/Effect.ts. The connectome continues to interface via standard observation and action vectors.

## Decisions

### 1. Connectome Topology Architecture (12,000–24,000 Neurons)
- **Structure**:
  - **Sensory Input (PNs)**: 100 neurons (50 left, 50 right antennal lobes) mapping the 5 dice + category availability.
  - **Bilateral Kenyon Cells (KCs)**: 10,000–20,000 neurons split symmetrically across Left & Right Mushroom Bodies (Calyx, α/α' vertical lobe, β/β'/γ medial lobes).
  - **Inhibitory Regulators (APL)**: 2 giant inhibitory neurons (1 per hemisphere) maintaining sparse coding (< 5% KC active rate).
  - **Central Complex (CX)**: 500–1,000 neurons modeling the Protocerebral Bridge (PB) and Ellipsoid Body (EB) acting as an internal recurrent ring for temporal decision memory.
  - **Output Motor Valves (MBONs)**: 48 neurons (24 left, 24 right) decoded into Yacht actions (hold dice masks, category selections).
- **Rationale**: Bilateral symmetry and Central Complex geometry provide the iconic "fly brain" 3D silhouette while keeping sparse matrix forward computation under 1 ms.
- *Alternatives considered*: Direct 139k full brain dump (rejected due to 50M synapse memory/render bottleneck in web browsers without specialized streaming tiles).

### 2. Frontend 3D Engine: Three.js WebGL with Instanced Points & Bloom
- **Stack**: Pure Three.js loaded via CDN or static vendor script, zero npm build step required.
- **Rendering Strategy**:
  - Neurons are rendered as `THREE.Points` or `THREE.InstancedMesh` with an additive glow shader.
  - SNN spike states update a Float32 `active` attribute on the GPU buffer, modulating particle scale and brightness without rebuilding geometries.
  - Synaptic signals are visualized as animated particle streaks along the strongest or currently firing pathways.
- *Alternatives considered*: 2D Canvas (insufficient depth and volume), Babylon.js (heavier bundle than Three.js).

### 3. Apple M4 Multi-Core Evolutionary Retraining
- **Parallelization**: 10 Islands mapped to 10 worker processes via `multiprocessing.Pool(processes=10)`.
- **Optimization Target**: Dense KC->MBON connection weights (e.g. 10,000 x 48 parameters) using mutation, uniform crossover, and stagnation-driven hypermutation.
- **Fitness Landscape**: 10 diverse islands (Jackpot, Upper Bonus, Straight Specialist, Risk-Averse, High Average) to preserve genetic diversity.

## Risks / Trade-offs

- **[Risk] High neuron count slowing down browser frame rate**  
  → *Mitigation*: Use GPU instanced vertex shaders and batch spike state updates into typed arrays. Target 60 FPS on Apple Silicon.
- **[Risk] Over-excitation / epileptic firing in 20k SNN**  
  → *Mitigation*: Strict APL feedback inhibition and biologically tuned claw-sampling thresholds (each KC requires 4–7 coincident PN inputs).
- **[Risk] Retraining convergence time**  
  → *Mitigation*: 10 parallel M4 cores evaluate 10 islands simultaneously; 50 generations complete within ~10–15 minutes.
