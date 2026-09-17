import sys
from pathlib import Path
import numpy as np
import pytest

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from island_evolution import (
    IslandConfig,
    Island,
    MultiIslandEvolution,
    evaluate_individual_island,
)
from forward_sim import load_cached_subcircuit
from synaptic_plasticity import extract_kc_mbon_dense
from evolution import Individual


def test_island_initialization_and_evaluation():
    base_adj, metadata = load_cached_subcircuit()
    weights = extract_kc_mbon_dense(base_adj, metadata)
    
    cfg = IslandConfig(
        name="Test Jackpot",
        bias_mode="jackpot",
        pop_size=4,
        elite_count=1,
        stagnation_threshold=2,
    )
    island = Island(cfg, weights, base_adj, metadata, seed=42)
    assert len(island.population) == 4
    assert island.current_sigma == cfg.base_mutation_sigma
    
    # Evaluate 1 game per individual
    island.evaluate(games_per_eval=1)
    assert island.population[0].fitness >= island.population[-1].fitness
    assert island.best_individual is not None
    assert island.stagnation_counter == 0


def test_island_adaptive_hypermutation():
    base_adj, metadata = load_cached_subcircuit()
    weights = extract_kc_mbon_dense(base_adj, metadata)
    
    cfg = IslandConfig(
        name="Test Stagnant",
        bias_mode="balanced",
        pop_size=3,
        stagnation_threshold=2,
        hypermutation_multiplier=2.0,
    )
    island = Island(cfg, weights, base_adj, metadata, seed=123)
    
    # Fake a very high best historical fitness that cannot be beaten
    island.best_historical_fitness = 99999.0
    
    # Evaluate generation 1 -> stagnation counter = 1
    island.evaluate(games_per_eval=1)
    assert island.stagnation_counter == 1
    assert island.current_sigma == cfg.base_mutation_sigma
    
    # Evaluate generation 2 -> stagnation counter = 2 >= stagnation_threshold
    island.evaluate(games_per_eval=1)
    assert island.stagnation_counter == 2
    assert np.isclose(island.current_sigma, cfg.base_mutation_sigma * 2.0)


def test_multi_island_migration():
    configs = [
        IslandConfig("Isl A", "jackpot", pop_size=4),
        IslandConfig("Isl B", "upper_bonus", pop_size=4),
    ]
    engine = MultiIslandEvolution(
        island_configs=configs,
        migration_interval=2,
        games_per_eval=1,
        seed=777,
    )
    
    # Step gen 0 (no migration)
    stat0 = engine.step_generation(0)
    assert stat0["migrated"] is False
    
    # Step gen 1 (no migration)
    stat1 = engine.step_generation(1)
    assert stat1["migrated"] is False
    
    # Step gen 2 (migration triggers at interval 2!)
    stat2 = engine.step_generation(2)
    assert stat2["migrated"] is True
    assert engine.global_best_individual is not None
