import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, List
import numpy as np

SRC_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SRC_DIR))

from forward_sim import FlySubcircuitSNN, load_cached_subcircuit
from agent import FlyBrainAgent, RandomAgent
from run_game import play_single_game
from synaptic_plasticity import set_kc_mbon_dense, extract_kc_mbon_dense
from island_evolution import MultiIslandEvolution, IslandConfig


def evaluate_agent_benchmark(agent, num_games: int = 50, name: str = "Agent") -> Dict:
    print(f"\n--- Running Benchmark: {name} ({num_games} games) ---")
    scores = []
    upper_sums = []
    upper_bonuses = 0
    category_zero_counts = {cat: 0 for cat in [
        "Aces", "Deuces", "Treys", "Fours", "Fives", "Sixes",
        "Choice", "FourOfAKind", "FullHouse", "SmallStraight", "LargeStraight", "Yacht"
    ]}
    category_scores = {cat: [] for cat in category_zero_counts}
    highlight_games = []
    
    for g_idx in range(num_games):
        res = play_single_game(agent, verbose=False)
        scores.append(res["total_score"])
        upper_sums.append(res["upper_sum"])
        if res["upper_bonus"] > 0:
            upper_bonuses += 1
            
        board = res["score_board"]
        for cat, pts in board.items():
            category_scores[cat].append(pts)
            if pts == 0:
                category_zero_counts[cat] += 1
                
        if res["total_score"] >= 150:
            highlight_games.append({
                "game_index": g_idx + 1,
                "total_score": res["total_score"],
                "upper_sum": res["upper_sum"],
                "upper_bonus": res["upper_bonus"],
                "board": board,
                "turns": res["turns"],
            })
            
    scores_arr = np.array(scores)
    yacht_hits = sum(1 for pts in category_scores["Yacht"] if pts == 50)
    full_house_hits = sum(1 for pts in category_scores["FullHouse"] if pts > 0)
    large_straight_hits = sum(1 for pts in category_scores["LargeStraight"] if pts == 30)
    four_kind_hits = sum(1 for pts in category_scores["FourOfAKind"] if pts > 0)
    
    stats = {
        "name": name,
        "games": num_games,
        "mean_score": float(np.mean(scores_arr)),
        "std_score": float(np.std(scores_arr)),
        "min_score": int(np.min(scores_arr)),
        "max_score": int(np.max(scores_arr)),
        "median_score": float(np.median(scores_arr)),
        "upper_bonus_rate": float(upper_bonuses / num_games),
        "mean_upper_sum": float(np.mean(upper_sums)),
        "yacht_rate": float(yacht_hits / num_games),
        "full_house_rate": float(full_house_hits / num_games),
        "large_straight_rate": float(large_straight_hits / num_games),
        "four_kind_rate": float(four_kind_hits / num_games),
        "zero_frequencies": {cat: int(cnt) for cat, cnt in category_zero_counts.items()},
        "category_means": {cat: float(np.mean(pts_list)) for cat, pts_list in category_scores.items()},
        "highlight_games": highlight_games[:5],  # top 5 highlights
    }
    
    print(f"[{name}] Mean: {stats['mean_score']:.2f} ± {stats['std_score']:.2f} | Range: [{stats['min_score']}..{stats['max_score']}] | Bonus Rate: {stats['upper_bonus_rate']*100:.1f}% | Yacht: {yacht_hits}/{num_games}")
    return stats


def run_experiment(
    generations: int = 150,
    games_per_eval: int = 6,
    migration_interval: int = 20,
    num_benchmark_games: int = 50,
    seed: int = 42,
):
    print("=" * 70)
    print(f" Drosophila Connectome SNN: Phase 5 Multi-Island Deep Evolution ")
    print(f" Islands: 6 demes | Generations: {generations} | Eval Games/Agent: {games_per_eval}")
    print("=" * 70)
    
    base_adj, metadata = load_cached_subcircuit()
    initial_weights = extract_kc_mbon_dense(base_adj, metadata)
    
    # 6 Island Specializations
    configs = [
        IslandConfig("Jackpot Island", "jackpot", pop_size=12, base_mutation_sigma=0.06),
        IslandConfig("Upper Bonus Island", "upper_bonus", pop_size=12, base_mutation_sigma=0.05),
        IslandConfig("Balanced Safety Island", "balanced", pop_size=12, base_mutation_sigma=0.05),
        IslandConfig("Hypermutation Island", "hypermutation", pop_size=12, base_mutation_sigma=0.12, base_mutation_rate=0.15),
        IslandConfig("High-Roller Island", "high_roller", pop_size=12, base_mutation_sigma=0.07),
        IslandConfig("Conservative Island", "conservative", pop_size=12, base_mutation_sigma=0.04),
    ]
    
    engine = MultiIslandEvolution(
        island_configs=configs,
        migration_interval=migration_interval,
        games_per_eval=games_per_eval,
        seed=seed,
    )
    
    start_total = time.perf_counter()
    
    print("\n--- Commencing Multi-Island Evolution ---")
    for gen in range(1, generations + 1):
        gen_stat = engine.step_generation(gen)
        
        if gen == 1 or gen % 10 == 0 or gen_stat["migrated"] or gen == generations:
            migr_str = " [MIGRATION]" if gen_stat["migrated"] else ""
            isl_summaries = " | ".join(
                f"{isl['name'][:4]}: {isl['mean_score']:.1f} (max {isl['max_score']})"
                for isl in gen_stat["island_stats"]
            )
            print(f"Gen {gen:3d}/{generations:3d} ({gen_stat['duration_sec']:.1f}s){migr_str} -> Best Fit: {gen_stat['global_best_fitness']:.1f} | Best Mean: {gen_stat['global_best_mean']:.1f} (Max {gen_stat['global_best_max']})")
            if gen % 20 == 0:
                print(f"       Islands: {isl_summaries}")
                
    elapsed_total = time.perf_counter() - start_total
    print(f"\nEvolution finished in {elapsed_total:.1f}s ({elapsed_total / 60.0:.2f} min).")
    
    champion = engine.global_best_individual
    assert champion is not None, "Champion cannot be None!"
    
    # Save champion weights to file
    data_dir = SRC_DIR.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    champ_path = data_dir / "super_champion_fly.npz"
    np.savez_compressed(
        champ_path,
        kc_mbon_weights=champion.weights,
        fitness=champion.fitness,
        mean_score=champion.stats["mean_score"],
        max_score=champion.stats["max_score"],
        generations=generations,
    )
    print(f"Saved Super Champion Fly weights to: {champ_path}")
    
    # Save evolution history
    history_path = data_dir / "island_evolution_history.json"
    with open(history_path, "w", encoding="utf-8") as f:
        json.dump({
            "generations": generations,
            "elapsed_sec": elapsed_total,
            "final_champion_fitness": champion.fitness,
            "final_champion_mean": champion.stats["mean_score"],
            "final_champion_max": champion.stats["max_score"],
            "history": engine.history,
        }, f, indent=2)
    print(f"Saved evolution history to: {history_path}")
    
    # Run 50-game comparison benchmarks
    # 1. Baseline Affordance SNN (initial weights)
    base_snn = FlySubcircuitSNN(base_adj, metadata)
    base_agent = FlyBrainAgent(snn=base_snn, sim_steps=12, pulse_steps=3)
    base_stats = evaluate_agent_benchmark(base_agent, num_games=num_benchmark_games, name="Baseline Affordance SNN")
    
    # 2. Super Champion Fly SNN (evolved weights)
    champ_adj = set_kc_mbon_dense(base_adj, metadata, champion.weights, preserve_topology=True)
    champ_snn = FlySubcircuitSNN(champ_adj, metadata)
    champ_agent = FlyBrainAgent(snn=champ_snn, sim_steps=12, pulse_steps=3)
    champ_stats = evaluate_agent_benchmark(champ_agent, num_games=num_benchmark_games, name="Evolved Super Champion SNN")
    
    # Save benchmark results
    benchmarks_path = data_dir / "phase5_benchmarks.json"
    with open(benchmarks_path, "w", encoding="utf-8") as f:
        json.dump({
            "baseline": base_stats,
            "super_champion": champ_stats,
        }, f, indent=2)
    print(f"Saved benchmark results to: {benchmarks_path}")
    
    return base_stats, champ_stats, engine.history


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--generations", type=int, default=150, help="Number of evolutionary generations")
    parser.add_argument("--games-per-eval", type=int, default=6, help="Evaluation games per individual per generation")
    parser.add_argument("--migration-interval", type=int, default=20, help="Generations between migrations")
    parser.add_argument("--benchmark-games", type=int, default=50, help="Games in post-evolution benchmark")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()
    
    run_experiment(
        generations=args.generations,
        games_per_eval=args.games_per_eval,
        migration_interval=args.migration_interval,
        num_benchmark_games=args.benchmark_games,
        seed=args.seed,
    )
