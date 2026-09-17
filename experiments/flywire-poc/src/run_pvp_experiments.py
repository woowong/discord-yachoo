import copy
import json
import time
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np

from forward_sim import FlySubcircuitSNN, load_cached_subcircuit
from extract import generate_synthetic_mushroom_body
from agent import FlyBrainAgent, RandomAgent
from advanced_cognition import AdvancedCognitionSNN, AdvancedCognitiveFlyAgent
from pvp_duel import play_1v1_match, calculate_elo, format_dramatic_match_narrative
from synaptic_plasticity import set_kc_mbon_dense, mutate_weights, extract_kc_mbon_dense
from topology_benchmark import DATA_DIR, analyze_agent_phenotype, load_champion_agent


def run_pvp_and_cognition_experiments():
    print("=" * 75)
    print(" ⚔️ Starting FlyWire Phase 4: PvP Duels, Cognition, & Scaling Experiments")
    print("=" * 75)
    
    results = {}
    base_adj, meta = load_cached_subcircuit()
    champion_path = DATA_DIR / "champion_fly_weights.npz"
    champion_agent = load_champion_agent(champion_path)
    
    # ---------------------------------------------------------
    # [실험 1] ⚔️ 초파리 1:1 글래디에이터 토너먼트 (승패 도파민 공진화)
    # ---------------------------------------------------------
    print("\n[실험 1/3] ⚔️ Running 16-Fly Gladiator Tournament with Elo & Dopamine...")
    
    # Create 16 fly gladiators with distinct weight variations
    gladiators = []
    base_dense = extract_kc_mbon_dense(base_adj, meta)
    
    names = [
        "Zeus-Fly", "Apollo-Fly", "Ares-Fly", "Hermes-Fly",
        "Athena-Fly", "Hera-Fly", "Artemis-Fly", "Poseidon-Fly",
        "Titan-Fly", "Viper-Fly", "Cobra-Fly", "Eagle-Fly",
        "Shadow-Fly", "Phantom-Fly", "Alpha-Fly", "Omega-Fly"
    ]
    
    for i, name in enumerate(names):
        mut_sigma = 0.04 + (i * 0.005)
        w = mutate_weights(base_dense, mutation_rate=0.1, sigma=mut_sigma)
        adj = set_kc_mbon_dense(base_adj, meta, w)
        snn = AdvancedCognitionSNN(adj, meta)
        agent = AdvancedCognitiveFlyAgent(snn=snn)
        gladiators.append({
            "id": i,
            "name": name,
            "agent": agent,
            "elo": 1200.0,
            "wins": 0,
            "losses": 0,
            "total_pts": 0,
            "dopamine_level": 100.0,
        })
        
    # Round-Robin matches (everyone plays 3 matches against random opponents)
    np.random.seed(42)
    all_matches = []
    most_dramatic_match = None
    max_lead_changes = -1
    highest_scoring_match = None
    max_combined_score = -1
    
    for round_idx in range(5):  # 5 rounds of pairings
        shuffled = np.random.permutation(len(gladiators))
        for j in range(0, len(gladiators), 2):
            idx_a = shuffled[j]
            idx_b = shuffled[j+1]
            g_a = gladiators[idx_a]
            g_b = gladiators[idx_b]
            
            match_res = play_1v1_match(g_a["agent"], g_b["agent"])
            
            # Outcome
            if match_res["winner"] == "A":
                score_a_outcome = 1.0
                g_a["wins"] += 1
                g_b["losses"] += 1
                # Dopamine surge for winner, octopamine stress for loser!
                g_a["dopamine_level"] += 25.0 + match_res["diff"]
                g_b["dopamine_level"] = max(10.0, g_b["dopamine_level"] - 15.0)
            elif match_res["winner"] == "B":
                score_a_outcome = 0.0
                g_b["wins"] += 1
                g_a["losses"] += 1
                g_b["dopamine_level"] += 25.0 + match_res["diff"]
                g_a["dopamine_level"] = max(10.0, g_a["dopamine_level"] - 15.0)
            else:
                score_a_outcome = 0.5
                
            new_ra, new_rb = calculate_elo(g_a["elo"], g_b["elo"], score_a_outcome)
            g_a["elo"] = new_ra
            g_b["elo"] = new_rb
            g_a["total_pts"] += match_res["score_a"]
            g_b["total_pts"] += match_res["score_b"]
            
            # Check drama
            lead_changes = sum(
                1 for k in range(1, len(match_res["rounds"]))
                if match_res["rounds"][k]["leader"] != "TIE" 
                and match_res["rounds"][k]["leader"] != match_res["rounds"][k-1]["leader"]
                and match_res["rounds"][k-1]["leader"] != "TIE"
            )
            
            if lead_changes > max_lead_changes:
                max_lead_changes = lead_changes
                most_dramatic_match = (g_a["name"], g_b["name"], match_res)
                
            comb_score = match_res["score_a"] + match_res["score_b"]
            if comb_score > max_combined_score:
                max_combined_score = comb_score
                highest_scoring_match = (g_a["name"], g_b["name"], match_res)
                
    # Sort leaderboard by Elo
    gladiators.sort(key=lambda g: g["elo"], reverse=True)
    
    print("\n--- 🏆 Final Fly Gladiator Elo Leaderboard ---")
    print(f"{'Rank':<5} | {'Gladiator':<15} | {'Elo':<8} | {'W-L':<6} | {'Avg Pts':<8} | {'Dopamine Level'}")
    print("-" * 65)
    for r, g in enumerate(gladiators, 1):
        total_games = max(g["wins"] + g["losses"], 1)
        avg_pts = g["total_pts"] / total_games
        print(f"{r:<5} | {g['name']:<15} | {g['elo']:<8.1f} | {g['wins']}-{g['losses']:<4} | {avg_pts:<8.1f} | ⚡ {g['dopamine_level']:.1f} uM")
        
    results["gladiator_leaderboard"] = [
        {
            "rank": r, "name": g["name"], "elo": float(g["elo"]),
            "wins": g["wins"], "losses": g["losses"],
            "avg_pts": float(g["total_pts"] / max(g["wins"] + g["losses"], 1)),
            "dopamine": float(g["dopamine_level"]),
        }
        for r, g in enumerate(gladiators, 1)
    ]
    
    # Format the most dramatic match log
    d_name_a, d_name_b, d_match = most_dramatic_match
    dramatic_narrative = format_dramatic_match_narrative(d_match, d_name_a, d_name_b)
    print("\n" + dramatic_narrative)
    results["dramatic_match"] = {
        "gladiator_a": d_name_a,
        "gladiator_b": d_name_b,
        "score_a": d_match["score_a"],
        "score_b": d_match["score_b"],
        "winner": d_match["winner"],
        "narrative": dramatic_narrative,
        "rounds": d_match["rounds"],
    }

    # ---------------------------------------------------------
    # [실험 2] 🧠 APL 동적 게이팅 & 단기 작업기억 인지 효과 검증
    # ---------------------------------------------------------
    print("\n[실험 2/3] 🧠 Evaluating Advanced Cognition (Dynamic APL + Working Memory)...")
    
    # Static APL baseline agent
    static_snn = FlySubcircuitSNN(base_adj, meta)
    static_agent = FlyBrainAgent(snn=static_snn)
    static_stats = analyze_agent_phenotype(static_agent, num_games=30)
    
    # Advanced Cognitive Agent
    adv_snn = AdvancedCognitionSNN(base_adj, meta)
    adv_agent = AdvancedCognitiveFlyAgent(snn=adv_snn)
    adv_stats = analyze_agent_phenotype(adv_agent, num_games=30)
    
    cognition_comparison = {
        "Static Fly (APL -0.6 Fixed)": {
            "mean": static_stats["mean_score"],
            "max": static_stats["max_score"],
        },
        "Cognitive Fly (Dynamic APL + Memory)": {
            "mean": adv_stats["mean_score"],
            "max": adv_stats["max_score"],
        }
    }
    results["cognition_comparison"] = cognition_comparison
    print(f"  Static Fly   : Mean {static_stats['mean_score']:.2f} pts | Max {static_stats['max_score']} pts")
    print(f"  Cognitive Fly: Mean {adv_stats['mean_score']:.2f} pts | Max {adv_stats['max_score']} pts")

    # ---------------------------------------------------------
    # [실험 3] 🔬 뉴런 개수 스케일링 실험 (1,500 KC vs 3,000 KC)
    # ---------------------------------------------------------
    print("\n[실험 3/3] 🔬 Scaling Kenyon Cell Layers (1,500 KCs vs 3,000 KCs)...")
    
    # Generate 3,000 KC expanded connectome
    t0 = time.perf_counter()
    scaled_adj, scaled_meta = generate_synthetic_mushroom_body(num_kc=3000, num_input_pn=50, num_mbon=24, seed=42)
    gen_time_ms = (time.perf_counter() - t0) * 1000.0
    
    scaled_snn = AdvancedCognitionSNN(scaled_adj, scaled_meta)
    scaled_agent = AdvancedCognitiveFlyAgent(snn=scaled_snn)
    scaled_stats = analyze_agent_phenotype(scaled_agent, num_games=30)
    
    scaling_comparison = {
        "Standard MB (1,500 KCs, 27k Synapses)": {
            "neurons": meta["total_neurons"],
            "synapses": meta["total_synapses"],
            "mean_score": adv_stats["mean_score"],
            "max_score": adv_stats["max_score"],
        },
        "Expanded MB (3,000 KCs, ~55k Synapses)": {
            "neurons": scaled_meta["total_neurons"],
            "synapses": scaled_meta["total_synapses"],
            "mean_score": scaled_stats["mean_score"],
            "max_score": scaled_stats["max_score"],
            "gen_time_ms": gen_time_ms,
        }
    }
    results["scaling_comparison"] = scaling_comparison
    print(f"  1,500 KCs: Mean {adv_stats['mean_score']:.2f} pts | Max {adv_stats['max_score']} pts")
    print(f"  3,000 KCs: Mean {scaled_stats['mean_score']:.2f} pts | Max {scaled_stats['max_score']} pts (Synapses: {scaled_meta['total_synapses']})")
    
    # Write to disk
    out_file = DATA_DIR / "pvp_experiment_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\n✅ All Phase 4 Results saved to {out_file}")
    print("=" * 75)
    return results


if __name__ == "__main__":
    run_pvp_and_cognition_experiments()
