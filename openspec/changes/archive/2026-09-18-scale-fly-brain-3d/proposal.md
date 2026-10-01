# Proposal: Scale Fly Brain Connectome & 3D WebGL Visualization

## Why

The current Drosophila connectome simulation is restricted to a minimal Mushroom Body subcircuit of 1,575 neurons rendered on a flat 2D HTML5 Canvas. While functionally capable of playing Yacht dice games, it lacks the visual fidelity, anatomical volume, and aesthetic punch seen in modern 3D connectome showcases (such as FlyWire Codex and Neuroglancer). 

Furthermore, the host machine is equipped with an Apple M4 chip (10 physical CPU cores, high-bandwidth GPU) and 32 GB unified memory with 94% headroom. Benchmarking confirms that sparse SNN simulation on this machine scales linearly and executes a 30,000-neuron forward step in just ~0.61 ms. By upgrading both the connectome topology scale (to 10,000–30,000+ neurons with bilateral lobes and central complex) and transitioning the frontend to a Three.js 3D WebGL particle engine with bloom and synaptic pulse effects, we maximize device utilization and achieve stunning visual impact without sacrificing real-time inference speed.

## What Changes

- **Scale Connectome Subcircuit Topology**:
  - Expand the synthetic / extracted fly connectome from 1,575 neurons up to 12,000–30,000+ neurons.
  - Model bilateral Mushroom Bodies (left & right hemispheres: Calyx, α/β/γ lobes), Central Complex (Protocerebral Bridge, Ellipsoid Body for motor coordination), and expanded Antennal Lobe / Optic sensory clusters.
  - Maintain biological sparse fan-in connectivity and feedback inhibition balance.
- **3D WebGL / Three.js Interactive Visualizer Engine**:
  - Replace the flat 2D Canvas in `experiments/flywire-poc/web/` with a Three.js 3D scene.
  - Support orbit camera controls (rotate, pan, zoom) to explore the fly brain in 360 degrees.
  - Render neurons as instanced glowing point clouds with dynamic intensity based on LIF membrane potential / spike state.
  - Render active synaptic signal cascades (laser pulse / spike trails) across active pathways.
- **M4 Multi-Core Island Evolution Retraining**:
  - Adapt `synaptic_plasticity.py` and `island_evolution.py` for scaled KC-MBON weight matrices.
  - Fully utilize the 10 M4 cores via `multiprocessing` to run 10 parallel evolutionary islands concurrently.
  - Retrain a new champion fly agent (`champion_fly_3d_weights.npz`) capable of achieving high Yacht dice scores under the expanded neural topology.
- **Telemetry & Web Server Optimization**:
  - Update `web_server.py` and telemetry serialization to stream high-density 3D coordinates, cluster labels, and time-binned spike vectors efficiently.

## Capabilities

### Modified Capabilities
- `flywire-connectome-extract`: Support multi-region scaled brain graph generation (bilateral MB + Central Complex, 10k-30k+ neurons) with 3D anatomical coordinate assignments.
- `flywire-realtime-web-visualizer`: Transform dashboard from 2D Canvas to Three.js 3D WebGL interactive viewer with glowing neuron point clouds and synaptic pulse shaders.
- `flywire-island-evolution`: Adapt genetic algorithm and SNN runner to train scaled connectome weights concurrently across 10 M4 CPU cores.

## Impact

- **Performance**: SNN step latency remains < 1 ms on Apple M4 CPU; WebGL rendering targets steady 60 FPS on M4 GPU.
- **Storage**: Matrix artifacts scale from ~1 MB to ~10–25 MB (npz format), easily cached in `data/`.
- **Backward Compatibility**: Existing game logic (`yacht_env.py`, `encoder.py`, `decoder.py`) maintains clean interface contracts; action and state vectors map seamlessly to expanded sensory/motor layers.
