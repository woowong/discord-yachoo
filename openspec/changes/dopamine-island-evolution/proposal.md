## Why

Recent real gameplay between humans and the FlyWire SNN AI revealed an obsessive behavioral loop: because `decode_hold_mask` contained hardcoded heuristic reflexes (e.g. unconditionally locking two pairs and freezing full houses without checking remaining categories), the fly continuously hunted for Full House even after scoring it in Round 4, resulting in repeated 0-point penalties.
Furthermore, the fly AI should rely on pure neural spike dynamics and biological dopamine/satiety modulation rather than rule-based heuristics. With abundant Apple Silicon hardware capacity (Apple M-series with 10+ cores capable of scaling beyond 400,000 synapses with negligible latency), we will expand the connectome scale, remove rule-based reflexes, and evolve dopamine-modulated agents across specialized evolutionary islands.

## What Changes

- **Neural-Dominant Hold Decoding**: Remove hardcoded pattern preservation rules (two-pair hold reflex, full-house lock reflex) from `decoder.py`. All 5 dice hold/reroll decisions will be determined directly by MBON activity and firing rates.
- **Satiety & Affordance Sensory Encoding**: Update `encoder.py` to suppress category-specific sensory signals (such as Full House PN 46) when those categories are already consumed, preventing false reward expectations.
- **Connectome Synapse Scale Expansion**: Exploit hardware headroom by supporting scaled connectome subcircuits (scaling Kenyon Cells up to 10,000~29,000 and synapses to 100,000~400,000+) for richer combinatorial representation, establishing the architectural bridge toward the full 166,700-neuron adult male Drosophila CNS connectome.
- **Dopamine Island Habitats**: Introduce 4 biologically distinct dopamine evolution islands in `island_evolution.py`:
  - *Island A (Satiety-Gated)*: PPL1 dopamine inhibition silences consumed categories.
  - *Island B (Affordance RPE)*: PAM dopamine bursts amplify high-potential categories (Upper Bonus, Yacht).
  - *Island C (Dynamic APL Attention / Male-Dimorphic Aggression)*: Late-game starvation and male-dimorphic drive inspire aggressive exploration via relaxed APL inhibition.
  - *Island D (Pure Neural Control)*: Baseline SNN without dopamine bias to benchmark pure synaptic learning.
- **Evolutionary League & Model Deployment**: Multi-generation parallel evolution with migration ring, culminating in a Gladiator tournament and deployment of the superior neural champion.
- **Full Male Connectome Architecture Pathway**: Lay down the "Frozen Scaffold + Local KC-MBON Plasticity" protocol, ensuring that future integration of the 166.7k-neuron adult male Drosophila connectome (~50M synapses) avoids the curse of dimensionality while enabling real-time serving on Apple Silicon via sparse matrix execution.

## Capabilities

### Modified Capabilities
- `flywire-yacht-sensory-motor`: Replaces rule-based pattern preservation reflexes with neural-driven MBON hold decoding and satiety-conditioned sensory projection.
- `flywire-island-evolution`: Introduces dopamine-conditioned island habitats (Satiety Gating, Affordance RPE, Dynamic APL Exploration, Pure SNN) and scaled synapse capacity with full connectome compatibility.

## Impact

- `experiments/flywire-poc/src/decoder.py`: Replaces heuristic hold checks with neural firing rate decoders.
- `experiments/flywire-poc/src/encoder.py`: Gating PN 46 and pattern sensory neurons by `available_categories`.
- `experiments/flywire-poc/src/island_evolution.py`: Adds 4 dopamine island configurations and multi-process evolution runners.
- `experiments/flywire-poc/src/web_server.py`: Deploys the evolved champion model for Discord gameplay.
- Performance: Utilizes multi-core parallel simulation on Apple Silicon with Scipy sparse matrix execution.

