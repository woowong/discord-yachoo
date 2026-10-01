import argparse
import time
from typing import Dict, List, Tuple
import numpy as np

from agent import FlyBrainAgent, RandomAgent, BaseYachtAgent
from yacht_env import YachtEnv, ScoreCategory


def play_single_game(agent: BaseYachtAgent, verbose: bool = False) -> Dict:
    """
    Plays a complete 12-round Yacht game with the given agent.
    Returns summary metrics and turn history.
    """
    env = YachtEnv()
    start_time = time.perf_counter()
    turn_records = []
    
    while not env.is_finished:
        r_num = env.round_num
        dice_history = [list(env.current_dice)]
        holds_history = []
        
        # Roll phase: up to 2 rerolls (roll_count goes 1 -> 2 -> 3)
        while env.roll_count < 3:
            available_cats = env.get_available_categories()
            holds = agent.decide_hold(env.current_dice, env.roll_count, available_cats)
            holds_history.append(holds)
            
            # If agent decides to hold all 5, stop rerolling early
            if all(holds):
                break
                
            env.roll(holds)
            dice_history.append(list(env.current_dice))
            
        # Scoring phase
        final_dice = list(env.current_dice)
        available_cats = env.get_available_categories()
        chosen_cat = agent.decide_category(final_dice, env.roll_count, available_cats)
        points = env.score(chosen_cat)
        
        turn_records.append({
            "round": r_num,
            "dice_rolls": dice_history,
            "holds": holds_history,
            "category": chosen_cat,
            "points": points,
            "cumulative": env.total_score
        })
        
        if verbose:
            rolls_str = " -> ".join(str(d) for d in dice_history)
            print(f"Round {r_num:2d} | Rolls: {rolls_str} | Pick: {chosen_cat:<13} | +{points:2d} pts | Total: {env.total_score:3d}")
            
    elapsed_ms = (time.perf_counter() - start_time) * 1000.0
    
    return {
        "total_score": env.total_score,
        "upper_sum": env.upper_section_sum,
        "upper_bonus": env.upper_bonus,
        "score_board": env.score_board,
        "turns": turn_records,
        "elapsed_ms": elapsed_ms,
        "completed": env.is_finished and len(env.get_available_categories()) == 0
    }


def run_benchmark(num_games: int = 20):
    print("=" * 70)
    print(f" 🪰 Yacht Autonomous Benchmark: FlyBrainAgent vs RandomAgent ({num_games} games)")
    print("=" * 70)
    
    fly_agent = FlyBrainAgent()
    random_agent = RandomAgent()
    
    # 1. Run FlyBrainAgent
    print(f"\n[1/2] Running FlyBrainAgent for {num_games} games...")
    fly_scores = []
    fly_bonuses = 0
    fly_times = []
    fly_completions = 0
    
    for g in range(num_games):
        res = play_single_game(fly_agent, verbose=False)
        fly_scores.append(res["total_score"])
        if res["upper_bonus"] > 0:
            fly_bonuses += 1
        fly_times.append(res["elapsed_ms"])
        if res["completed"]:
            fly_completions += 1
            
    # 2. Run RandomAgent
    print(f"[2/2] Running RandomAgent for {num_games} games...")
    rand_scores = []
    rand_bonuses = 0
    rand_times = []
    rand_completions = 0
    
    for g in range(num_games):
        res = play_single_game(random_agent, verbose=False)
        rand_scores.append(res["total_score"])
        if res["upper_bonus"] > 0:
            rand_bonuses += 1
        rand_times.append(res["elapsed_ms"])
        if res["completed"]:
            rand_completions += 1
            
    # Summary Report
    print("\n" + "=" * 70)
    print(f"{'Metric':<25} | {'FlyBrainAgent (Connectome)':<22} | {'RandomAgent (Baseline)':<20}")
    print("-" * 70)
    print(f"{'Completion Rate':<25} | {fly_completions}/{num_games} ({fly_completions/num_games*100:.1f}%)" + f"{'':<11} | {rand_completions}/{num_games} ({rand_completions/num_games*100:.1f}%)")
    print(f"{'Average Total Score':<25} | {np.mean(fly_scores):<22.2f} | {np.mean(rand_scores):<20.2f}")
    print(f"{'Std Deviation':<25} | {np.std(fly_scores):<22.2f} | {np.std(rand_scores):<20.2f}")
    print(f"{'Min / Max Score':<25} | {np.min(fly_scores):3d} / {np.max(fly_scores):3d}{'':<14} | {np.min(rand_scores):3d} / {np.max(rand_scores):3d}")
    print(f"{'Upper Bonus Rate (>=63)':<25} | {fly_bonuses}/{num_games} ({fly_bonuses/num_games*100:.1f}%)" + f"{'':<12} | {rand_bonuses}/{num_games} ({rand_bonuses/num_games*100:.1f}%)")
    print(f"{'Avg Duration / Game':<25} | {np.mean(fly_times):<19.2f} ms | {np.mean(rand_times):<17.2f} ms")
    print("=" * 70)
    
    assert fly_completions == num_games, "FlyBrainAgent failed to complete all games!"
    print("✅ VERIFICATION PASSED: 100% 12-round autonomous game completion confirmed!")


def main():
    parser = argparse.ArgumentParser(description="Run autonomous Yacht game with FlyBrainAgent.")
    parser.add_argument("--games", type=int, default=1, help="Number of games to run in benchmark mode")
    parser.add_argument("--demo", action="store_true", help="Show single game with detailed round-by-round trace")
    args = parser.parse_args()
    
    if args.demo or args.games == 1:
        print("=" * 70)
        print(" 🪰 Live Single Game Demo: FlyBrainAgent Playing Yacht (12 Rounds)")
        print("=" * 70)
        agent = FlyBrainAgent()
        res = play_single_game(agent, verbose=True)
        print("=" * 70)
        print(f"Final Score: {res['total_score']} pts (Upper Sum: {res['upper_sum']}, Bonus: {res['upper_bonus']})")
        print(f"Duration: {res['elapsed_ms']:.2f} ms")
        print(f"Game Completed: {res['completed']}")
        print("=" * 70)
    else:
        run_benchmark(num_games=args.games)


if __name__ == "__main__":
    main()
