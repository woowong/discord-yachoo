## 1. Neural-Dominant Sensory & Motor Refactoring

- [ ] 1.1 Remove rule-based heuristic overrides (unconditional two-pair hold and full-house freeze) in `experiments/flywire-poc/src/decoder.py` and implement neural drive selection based on MBON firing counts and `available_categories`. Verify via `pytest experiments/flywire-poc/tests/test_interface.py`.
- [ ] 1.2 Update `experiments/flywire-poc/src/encoder.py` to condition Full House PN 46 and pattern detector currents on category availability (`available_categories`) to implement satiety sensory silencing. Verify via `pytest experiments/flywire-poc/tests/test_affordance.py`.
- [ ] 1.3 Update `experiments/flywire-poc/src/agent.py` and `telemetry_agent.py` to pass `available_categories` into `decode_hold_mask`. Verify via `pytest experiments/flywire-poc/tests/test_act_api.py`.

## 2. Connectome Synapse Scaling & Neuromodulation

- [ ] 2.1 Enhance `experiments/flywire-poc/src/forward_sim.py` and `synaptic_plasticity.py` to support high-capacity connectomes (up to 400,000+ synapses) with Scipy CSR fast step execution. Verify matrix sparsity and forward simulation benchmark.
- [ ] 2.2 Implement DAN gating layer (PAM reward boost for high-value targets, PPL1 satiety inhibition for filled categories) modulating KC-MBON synaptic propagation. Verify unit test for dopamine-modulated forward pass.

## 3. Dopamine Island Evolution Architecture

- [ ] 3.1 Implement 4 specialized dopamine island configurations in `experiments/flywire-poc/src/island_evolution.py` (Island A: Satiety Gating, Island B: Affordance RPE, Island C: Dynamic APL Attention, Island D: Pure SNN Control).
- [ ] 3.2 Add multi-core parallel simulation runner utilizing Apple Silicon CPU cores with ring migration every 5 generations.
- [ ] 3.3 Execute 100-generation island evolution benchmark script and save elite champion weights to `data/`.

## 4. Tournament Benchmarking & Deployment

- [ ] 4.1 Implement 200-game gladiator tournament comparing champions from the 4 islands against the baseline model, measuring mean score, redundant pattern fixation rate (target: 0%), and upper bonus hit rate.
- [ ] 4.2 Update `experiments/flywire-poc/src/web_server.py` to load the newly evolved champion model with dopamine satiety gating and verify via `POST /api/fly/act` and `GET /api/status`.
