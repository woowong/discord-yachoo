import json
import time
from pathlib import Path
import numpy as np

from forward_sim import FlySubcircuitSNN, load_cached_subcircuit
from agent import FlyBrainAgent, RandomAgent
from evolution import ConnectomeEvolution
from topology_benchmark import (
    DATA_DIR,
    DenseMLPAgent,
    generate_random_erdos_renyi_snn,
    analyze_agent_phenotype,
    save_champion_weights,
    load_champion_agent,
)
from synaptic_plasticity import set_kc_mbon_dense


def run_100_gen_experiment():
    print("=" * 75)
    print(" 🚀 Starting 100-Generation Connectome Deep Evolution")
    print("=" * 75)
    
    results = {}
    
    # ---------------------------------------------------------
    # [1] 100-Generation Deep Evolution
    # ---------------------------------------------------------
    print("\n[Step 1/3] 🧬 Running 100 Generations of Neuroevolution (Pop: 30, 8 games/eval)...")
    evo = ConnectomeEvolution(
        pop_size=30,
        elite_count=4,
        tournament_k=3,
        mutation_rate=0.08,
        mutation_sigma=0.06,
        games_per_eval=8,
        bias_mode="neutral",
        seed=42,
    )
    history = evo.run(generations=100, verbose=True)
    results["evolution_history"] = history
    
    champion_path = DATA_DIR / "champion_fly_weights.npz"
    save_champion_weights(evo.best_individual.weights, evo.metadata, champion_path)
    champion_agent = load_champion_agent(champion_path)
    
    # ---------------------------------------------------------
    # [2] Comparative Benchmark
    # ---------------------------------------------------------
    print("\n[Step 2/3] 🧠 Running Benchmark against Baselines (30 games each)...")
    base_adj, meta = load_cached_subcircuit()
    
    untrained_agent = FlyBrainAgent()
    untrained_pheno = analyze_agent_phenotype(untrained_agent, num_games=30)
    
    trained_pheno = analyze_agent_phenotype(champion_agent, num_games=30)
    
    random_agent = RandomAgent()
    random_pheno = analyze_agent_phenotype(random_agent, num_games=30)
    
    rand_adj, rand_meta = generate_random_erdos_renyi_snn(meta, density=0.012, seed=99)
    rand_snn_agent = FlyBrainAgent(snn=FlySubcircuitSNN(rand_adj, rand_meta))
    rand_snn_pheno = analyze_agent_phenotype(rand_snn_agent, num_games=30)
    
    np.random.seed(42)
    mlp_w1 = np.random.randn(50, 128).astype(np.float32) * 0.1
    mlp_w2 = np.random.randn(128, 24).astype(np.float32) * 0.1
    mlp_agent = DenseMLPAgent(mlp_w1, mlp_w2)
    mlp_pheno = analyze_agent_phenotype(mlp_agent, num_games=30)
    
    topology_results = {
        "Random Agent": {
            "mean": random_pheno["mean_score"],
            "max": random_pheno["max_score"],
        },
        "Untrained Fly (Gen 0)": {
            "mean": untrained_pheno["mean_score"],
            "max": untrained_pheno["max_score"],
        },
        "Trained Champion Fly (Gen 100)": {
            "mean": trained_pheno["mean_score"],
            "max": trained_pheno["max_score"],
        },
        "Random Erdős–Rényi SNN": {
            "mean": rand_snn_pheno["mean_score"],
            "max": rand_snn_pheno["max_score"],
        },
        "Standard Dense MLP": {
            "mean": mlp_pheno["mean_score"],
            "max": mlp_pheno["max_score"],
        },
    }
    results["topology_comparison"] = topology_results
    
    print("\n--- 30-Game Evaluation Results ---")
    for name, stat in topology_results.items():
        print(f"  {name:<32}: Mean {stat['mean']:6.2f} pts | Max {stat['max']:3d} pts")
        
    # ---------------------------------------------------------
    # [3] Phenotype & Behavioral Analysis
    # ---------------------------------------------------------
    print("\n[Step 3/3] 🪰 Profiling 100-Gen Champion Fly Phenotype...")
    results["champion_phenotype"] = {
        "hold_ratios_by_face": trained_pheno["hold_ratios_by_face"],
        "category_summary": trained_pheno["category_summary"],
        "max_score": trained_pheno["max_score"],
        "min_score": trained_pheno["min_score"],
    }
    
    print("  Hold Ratio by Dice Face:")
    for face, ratio in trained_pheno["hold_ratios_by_face"].items():
        bar = "█" * int(ratio * 20)
        print(f"    Face [{face}]: {ratio*100:5.1f}% | {bar}")
        
    out_file = DATA_DIR / "experiment_results_100gen.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\n✅ 100-Gen Experiment Results saved to {out_file}")
    print("=" * 75)
    return results


if __name__ == "__main__":
    run_100_gen_experiment()
