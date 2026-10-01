import sys
from pathlib import Path
import numpy as np

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from evolution import ConnectomeEvolution, evaluate_individual, Individual
from forward_sim import load_cached_subcircuit
from synaptic_plasticity import extract_kc_mbon_dense


def test_individual_evaluation():
    base_adj, meta = load_cached_subcircuit()
    dense = extract_kc_mbon_dense(base_adj, meta)
    ind = Individual(dense)
    fitness = evaluate_individual(ind, base_adj, meta, num_games=2, bias_mode="neutral")
    assert fitness > 0.0
    assert ind.stats["mean_score"] > 0.0


def test_mini_evolution_progression():
    evo = ConnectomeEvolution(
        pop_size=10,
        elite_count=2,
        tournament_k=2,
        games_per_eval=2,
        bias_mode="neutral",
        seed=123,
    )
    history = evo.run(generations=3, verbose=False)
    assert len(history) == 3
    assert evo.best_individual is not None
    assert evo.best_individual.fitness > 0.0
    for stat in history:
        assert "best_mean_score" in stat
        assert "pop_mean_score" in stat
        assert stat["duration_sec"] > 0.0


def test_bias_modes():
    base_adj, meta = load_cached_subcircuit()
    dense = extract_kc_mbon_dense(base_adj, meta)
    
    ind_dopamine = Individual(dense.copy())
    evaluate_individual(ind_dopamine, base_adj, meta, num_games=2, bias_mode="dopamine_jackpot")
    
    ind_octopamine = Individual(dense.copy())
    evaluate_individual(ind_octopamine, base_adj, meta, num_games=2, bias_mode="octopamine_aversion")
    
    assert ind_dopamine.fitness != 0.0
    assert ind_octopamine.fitness != 0.0
