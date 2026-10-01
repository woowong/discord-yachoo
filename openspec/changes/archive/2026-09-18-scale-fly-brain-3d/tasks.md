# Implementation Tasks: Scaled Fly Brain & 3D WebGL Visualization

## 1. Connectome Topology Scaling & 3D Synthesis

- [x] 1.1 Implement scaled bilateral Drosophila connectome generator in `src/extract.py` with 3D coordinate generation (bilateral MB, CX, AL, MBONs) and verify via unit test `tests/test_extract_scaled.py`
- [x] 1.2 Export scaled adjacency matrix (`mb_scaled_adj.npz`) and metadata (`mb_scaled_meta.json`) and verify matrix sparsity and layer dimensions with `python -m pytest tests/`
- [x] 1.3 Update LIF SNN simulator (`src/forward_sim.py`) to support multi-region bilateral slicing and verify single-step latency < 1 ms on Apple M4

## 2. Three.js 3D WebGL Visualization Engine

- [x] 2.1 Integrate Three.js and OrbitControls into `web/index.html` and `web/app.js`, replacing 2D canvas with a 3D WebGL viewport
- [x] 2.2 Implement 3D glowing point cloud shader (`THREE.Points`) for scaled neurons with spike illumination dynamics and verify 60 FPS in browser
- [x] 2.3 Implement dynamic synaptic signal pulse rendering along active pathways connecting AL -> KC -> MBON
- [x] 2.4 Update `web_server.py` to serve `/api/topology` returning 3D coordinates and cluster metadata, verified by curl test

## 3. M4 Multi-Core Island Evolution Retraining

- [x] 3.1 Adapt `synaptic_plasticity.py` for scaled KC-MBON weight blocks and verify mutation/crossover preservation
- [x] 3.2 Update `island_evolution.py` to spawn 10 parallel island processes leveraging all 10 M4 cores, verified with `python src/run_island_experiment.py --test-run`
- [x] 3.3 Execute 50-generation retraining run, monitor progress via `btop` / herdr pane, and save `data/champion_fly_3d_weights.npz`
- [x] 3.4 Benchmark retrained champion agent against random and heuristic baselines across 100 Yacht games and log results to `data/scaled_benchmarks.json`
