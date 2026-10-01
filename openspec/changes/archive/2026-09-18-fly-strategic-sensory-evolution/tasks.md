## 1. Sensory Expansion & Connectome Matrix Update

- [x] 1.1 Update `extract.py` to generate 64-PN subcircuit & 128-PN bilateral connectome, and verify generated `mb_subcircuit_adj.npz` and `mb_subcircuit_meta.json` with forward simulation test.
- [x] 1.2 Update `encoder.py` to compute PN 50..63 interoceptive, topological, economic, and PvP sensory features and verify vector shape (64 unilateral, 128 bilateral) and values via unit test.
- [x] 1.3 Update `decoder.py` to refine behavioral drive selection and category scoring with straight hunting affordance (open-ended vs gutshot discrimination), verifying hold masks without heuristic bypass.

## 2. 4-Island Quality-Diversity Demes & Continuous Reward Shaping

- [x] 2.1 Refactor `island_evolution.py` fitness functions to implement the 4 specialized demes (Straight Hunter, Upper 63 Saver with quadratic shaping $(\text{UpperSum}^2)$, Jackpot Predator, Hybrid Synthesizer) and ring migration crossover.
- [x] 2.2 Implement `notion_reporter.py` to format and publish structured evolutionary milestone documents to Notion under parent page `3b6a6abe-c85c-8083-bd48-cf5d4674ae6c`.
- [x] 2.3 Integrate periodic milestone reporting hooks into `MultiIslandEvolution` to publish intermediate progress reports to Notion at generational checkpoints (e.g., Gen 0 baseline, intermediate milestones, and final generation).

## 3. Deep Generational Evolution Execution & Intermediate Notion Reporting

- [x] 3.1 Run baseline evaluation of Gen 0 population and publish the initial baseline evolution report to Notion.
- [x] 3.2 Execute extended generational evolution (100+ generations) across multi-core workers, generating intermediate Notion progress reports showing evolutionary trajectory (mean score, straight hunting rate, 63-bonus rate).
- [x] 3.3 Finalize evolution run, save elite champion weights to `champion_fly_v3_weights.npz` (and `champion_fly_weights.npz`), and publish the final evolution milestone report to Notion.

## 4. Benchmarking, Validation & Verification

- [x] 4.1 Run 200-game gladiator tournament benchmark comparing Fly Brain v3 against v2 baseline to verify straight success rate (>20%) and upper bonus rate (>10%).
- [x] 4.2 Replay historical match 1pisssm critical decision points (`[1, 3, 5, 4, 6]` straight roll) to verify that Fly Brain v3 holds the straight rather than collapsing into low pairs.
- [x] 4.3 Run full test suite (`pytest`) to ensure all sensory expansion, decoding, and island evolution tests pass cleanly.
