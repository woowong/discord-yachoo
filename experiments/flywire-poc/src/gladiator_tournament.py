import argparse
import copy
import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import numpy as np
import scipy.sparse as sp

from forward_sim import FlySubcircuitSNN, load_cached_subcircuit, load_scaled_subcircuit
from synaptic_plasticity import set_kc_mbon_dense, extract_kc_mbon_dense
from agent import FlyBrainAgent, RandomAgent, BaseYachtAgent
from yacht_env import YachtEnv, CATEGORIES, ScoreCategory, calculate_score

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def evaluate_agent_gladiator(
    agent: BaseYachtAgent,
    num_games: int = 200,
    agent_name: str = "Agent",
    verbose: bool = False,
) -> Dict:
    """
    Evaluates an agent across multiple full Yacht games, measuring:
    - Overall scoring performance (mean, std, min, max)
    - Upper Bonus hit rate (sum >= 63)
    - Redundant pattern fixation rate (target: 0.0%):
      Specifically tracking if the agent wasted rolls hunting an already-scored pattern
      such as holding two pairs or full house when Full House is already consumed.
    """
    total_scores: List[int] = []
    upper_sums: List[int] = []
    upper_bonuses: int = 0
    yacht_hits: int = 0
    full_house_hits: int = 0
    large_straight_hits: int = 0
    small_straight_hits: int = 0
    four_kind_hits: int = 0
    zero_scores_count: int = 0
    redundant_pattern_fixations: int = 0
    total_decisions: int = 0

    start_time = time.perf_counter()

    for game_idx in range(num_games):
        env = YachtEnv()
        while not env.is_finished:
            while env.roll_count < 3:
                dice = list(env.current_dice)
                avail = env.get_available_categories()
                holds = agent.decide_hold(dice, env.roll_count, avail)
                total_decisions += 1

                # Check redundant pattern fixation:
                # If FullHouse is NOT in available categories, but agent held two pairs or full-house:
                if "FullHouse" not in avail:
                    from collections import Counter
                    c = Counter(dice)
                    freqs = sorted(c.values(), reverse=True)
                    # If two pairs formed and agent held both pairs:
                    if len(freqs) >= 2 and freqs[0] == 2 and freqs[1] == 2:
                        held_dice = [d for d, h in zip(dice, holds) if h]
                        held_c = Counter(held_dice)
                        if sorted(held_c.values(), reverse=True) == [2, 2]:
                            redundant_pattern_fixations += 1
                    # Or full house formed and agent locked all 5:
                    elif freqs == [3, 2] and all(holds):
                        redundant_pattern_fixations += 1

                if all(holds):
                    break
                env.roll(holds)

            chosen_cat = agent.decide_category(list(env.current_dice), env.roll_count, env.get_available_categories())
            pts = env.score(chosen_cat)
            if pts == 0:
                zero_scores_count += 1

        total_scores.append(env.total_score)
        upper_sums.append(env.upper_section_sum)
        if env.upper_bonus > 0:
            upper_bonuses += 1

        board = env.score_board
        if board.get("Yacht", 0) == 50:
            yacht_hits += 1
        if board.get("FullHouse", 0) > 0:
            full_house_hits += 1
        if board.get("LargeStraight", 0) == 30:
            large_straight_hits += 1
        if board.get("SmallStraight", 0) == 15:
            small_straight_hits += 1
        if board.get("FourOfAKind", 0) > 0:
            four_kind_hits += 1

    elapsed = time.perf_counter() - start_time
    mean_score = float(np.mean(total_scores))
    std_score = float(np.std(total_scores))
    fixation_rate = float(redundant_pattern_fixations / max(total_decisions, 1))

    results = {
        "name": agent_name,
        "num_games": num_games,
        "mean_score": round(mean_score, 2),
        "std_score": round(std_score, 2),
        "min_score": int(np.min(total_scores)),
        "max_score": int(np.max(total_scores)),
        "upper_bonus_rate": round(upper_bonuses / num_games, 4),
        "mean_upper_sum": round(float(np.mean(upper_sums)), 2),
        "yacht_rate": round(yacht_hits / num_games, 4),
        "full_house_rate": round(full_house_hits / num_games, 4),
        "large_straight_rate": round(large_straight_hits / num_games, 4),
        "small_straight_rate": round(small_straight_hits / num_games, 4),
        "four_kind_rate": round(four_kind_hits / num_games, 4),
        "avg_zero_count": round(zero_scores_count / num_games, 2),
        "redundant_pattern_fixation_rate": round(fixation_rate, 4),
        "elapsed_sec": round(elapsed, 2),
    }

    if verbose:
        print(f"[{agent_name}] Games: {num_games} | Mean: {results['mean_score']} ± {results['std_score']} | "
              f"Max: {results['max_score']} | UpperBonus: {results['upper_bonus_rate']*100:.1f}% | "
              f"Fixation Rate: {results['redundant_pattern_fixation_rate']*100:.2f}% | Time: {elapsed:.1f}s")

    return results


def run_gladiator_tournament(num_games: int = 200, verbose: bool = True) -> Dict[str, Dict]:
    base_adj, base_meta = load_cached_subcircuit()
    
    # 1. Baseline Model (Unevolved SNN, no DAN modulation)
    baseline_snn = FlySubcircuitSNN(base_adj, base_meta)
    baseline_agent = FlyBrainAgent(snn=baseline_snn, enable_dan_modulation=False)

    # 2. Fly Brain v3 Strategic QD Champion (64-PN)
    v3_champ_path = DATA_DIR / "champion_fly_v3_weights.npz"
    v3_agent = None
    if v3_champ_path.exists():
        v3_data = np.load(v3_champ_path)
        v3_w = v3_data["weights"] if "weights" in v3_data else v3_data["kc_mbon_weights"]
        v3_adj = set_kc_mbon_dense(base_adj, base_meta, v3_w, preserve_topology=True)
        v3_snn = FlySubcircuitSNN(v3_adj, base_meta)
        v3_agent = FlyBrainAgent(snn=v3_snn, enable_dan_modulation=True)

    # 3. Legacy Dopamine Island Champion Model
    dopamine_champ_path = DATA_DIR / "champion_fly_weights.npz"
    if dopamine_champ_path.exists():
        data = np.load(dopamine_champ_path)
        w = data["weights"] if "weights" in data else data["kc_mbon_weights"]
        champ_adj = set_kc_mbon_dense(base_adj, base_meta, w, preserve_topology=True)
        champ_snn = FlySubcircuitSNN(champ_adj, base_meta)
        champ_agent = FlyBrainAgent(snn=champ_snn, enable_dan_modulation=True)
    else:
        champ_agent = baseline_agent

    # 4. Pure Neural Control (Evolved weights, no DAN dopamine modulation)
    pure_snn_agent = FlyBrainAgent(snn=v3_snn if v3_agent else champ_snn, enable_dan_modulation=False)

    agents_to_test = [
        ("Baseline (Unevolved, No Dopamine)", baseline_agent),
        ("Pure SNN Control (Evolved, No Dopamine)", pure_snn_agent),
        ("Fly Brain v2 Champion (Dopamine Island)", champ_agent),
    ]
    if v3_agent is not None:
        agents_to_test.append(("Fly Brain v3 Strategic QD Champion (64-PN)", v3_agent))

    print(f"\n⚔️  Starting Gladiator Tournament ({num_games} games per contestant)...")
    tournament_results = {}
    for name, agent in agents_to_test:
        res = evaluate_agent_gladiator(agent, num_games=num_games, agent_name=name, verbose=verbose)
        tournament_results[name] = res

    # Save results to data dir
    out_file = DATA_DIR / "gladiator_tournament_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(tournament_results, f, indent=2)
    print(f"\n💾 Saved tournament results to {out_file}")

    return tournament_results


def main():
    parser = argparse.ArgumentParser(description="FlyWire Gladiator Tournament Benchmark")
    parser.add_argument("--games", type=int, default=200, help="Number of games per agent")
    parser.add_argument("--quick", action="store_true", help="Quick run with 20 games")
    args = parser.parse_args()

    games = 20 if args.quick else args.games
    run_gladiator_tournament(num_games=games, verbose=True)


if __name__ == "__main__":
    main()
