## Context

See `proposal.md` for motivation.
Currently, `experiments/flywire-poc` runs a 1,575-neuron connectome subcircuit with Scipy sparse CSR matrices.
The `decode_hold_mask` function in `decoder.py` contained hardcoded heuristic overrides that forced two-pair holds and full-house locks regardless of remaining categories.
At the same time, Apple Silicon hardware has extensive computational headroom (10+ CPU cores, unified memory), capable of simulating connectomes with hundreds of thousands of synapses (`mb_scaled_adj.npz` has 401,839 synapses across 29,950 neurons) in sub-millisecond steps.

## Goals / Non-Goals

**Goals:**
- Eliminate rule-based hold heuristics from `decoder.py` so that game actions are driven by MBON firing patterns and synaptic plasticity.
- Implement Satiety-Gated sensory projection in `encoder.py` that suppresses signals for already scored categories.
- Support scaling connectome synapses up to 400,000+ edges for enhanced combinatorial representation.
- Architect 4 biologically inspired dopamine evolution islands in `island_evolution.py` with multi-process parallel execution on Mac hardware.
- Benchmark and compare the evolved champion models against baseline in tournament play.

**Non-Goals:**
- Real-time continuous backpropagation/RL in Cloudflare Workers (training runs locally on Mac via island evolution; inference weights are exported to npz).
- Replacing the Discord bot presentation layer or Effect.ts game engine.

## Decisions

### Decision 1: Pure Neural Hold Decoding with Behavioral Drive Selection
- **Choice**: Remove lines 39-53 of `decoder.py` (the unconditional full-house lock and two-pair hold rules). Instead, pass `available_categories` to `decode_hold_mask` and use the MBON [0..4] firing counts to select the behavioral drive (Multiples, Straight, High-Value, Exploration, Harvest), evaluated against available categories.
- **Alternative Considered**: Adding a simple `if "FullHouse" in available_categories:` check before the heuristic.
  - *Why rejected*: Keeps the agent rule-based rather than neural. We want the SNN's evolved synaptic weights to govern decisions.

### Decision 2: Satiety Gating in Sensory Projection
- **Choice**: In `encoder.py`, condition pattern detector PNs (e.g. PN 46 for Full House) on whether the category is in `available_categories`:
  ```python
  currents[46] = 2.0 if (is_full_house and "FullHouse" in avail_set) else 0.0
  ```
  This biological "satiety" principle prevents the Mushroom Body from sensing an already-consumed food source.
- **Alternative Considered**: Zeroing all PN inputs when score is 0.
  - *Why rejected*: Destroys spatial dice representation needed for upper section scoring.

### Decision 3: Connectome Synapse Scaling & DAN Neuromodulation
- **Choice**: Enable seamless toggle between Base (1,575 neurons, 27,664 synapses) and Scaled (29,950 neurons, 401,839 synapses) connectomes. Integrate Dopaminergic Neuron (DAN) compartment gating (PAM for reward/approach, PPL1 for avoidance/satiety) to modulate KC $\to$ MBON synaptic transmission during inference.
- **Alternative Considered**: Pure dense neural networks (MLP).
  - *Why rejected*: Destroys the authentic connectome topology from FlyWire and biological visualizer fidelity.

### Decision 4: 4-Island Dopamine Neuroevolution Ecosystem
- **Choice**: Configure 4 islands with distinct dopamine fitness landscapes:
  - *Island A (Satiety-Gated)*: Heavy penalty for wasting turns on 0-point redundant patterns.
  - *Island B (Affordance RPE)*: Fitness bonus for tracking high-yield opportunities (Upper Bonus + Yacht).
  - *Island C (Dynamic APL Attention)*: Rewards late-game risk-taking (Large Straight, Yacht) when options dwindle.
  - *Island D (Pure Control)*: Pure score optimization without dopamine biasing.
  A ring migration topology exchanges 2 elites every 5 generations.

## Risks / Trade-offs

- **[Risk] SNN without heuristics may initially score lower during early generations** →
  *Mitigation*: Pre-seed Gen 0 with existing champion synaptic weights (`champion_fly_weights.npz`) as the initial ancestral genome, allowing evolution to refine rather than start from random noise.
- **[Risk] Scaled 30,000-neuron model simulation latency during 100-generation training** →
  *Mitigation*: Use Python `multiprocessing` pool utilizing all 10 Apple Silicon CPU cores, vectorized Scipy CSR step functions, and optimized simulation step counts (12~15 steps per roll).
- **[Risk] Memory pressure across 40 parallel games** →
  *Mitigation*: Sparse matrix operations in Scipy use < 50MB per worker, total RAM footprint under 1GB.
