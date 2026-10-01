import copy
import math
import time
from typing import Dict, List, Optional, Tuple
import numpy as np

from agent import BaseYachtAgent, FlyBrainAgent, RandomAgent
from yacht_env import YachtEnv, CATEGORIES
from run_game import play_single_game


def calculate_elo(r_a: float, r_b: float, score_a: float, k: float = 32.0) -> Tuple[float, float]:
    """Updates Elo ratings for two agents based on match outcome (score_a: 1.0=win, 0.5=draw, 0.0=loss)."""
    expected_a = 1.0 / (1.0 + 10.0 ** ((r_b - r_a) / 400.0))
    expected_b = 1.0 - expected_a
    score_b = 1.0 - score_a
    new_r_a = r_a + k * (score_a - expected_a)
    new_r_b = r_b + k * (score_b - expected_b)
    return new_r_a, new_r_b


def play_1v1_match(agent_a: BaseYachtAgent, agent_b: BaseYachtAgent, verbose: bool = False) -> Dict:
    """
    Simulates a head-to-head 1v1 Yacht match between two agents.
    Both agents play 12 alternating rounds on independent boards.
    Returns winner, final scores, score difference, and turn-by-turn narrative.
    """
    env_a = YachtEnv()
    env_b = YachtEnv()
    
    rounds_log = []
    
    for r in range(1, 13):
        # --- Agent A Turn ---
        rolls_a = [list(env_a.current_dice)]
        while env_a.roll_count < 3:
            avail_a = env_a.get_available_categories()
            holds_a = agent_a.decide_hold(env_a.current_dice, env_a.roll_count, avail_a)
            if all(holds_a):
                break
            env_a.roll(holds_a)
            rolls_a.append(list(env_a.current_dice))
        cat_a = agent_a.decide_category(list(env_a.current_dice), env_a.roll_count, env_a.get_available_categories())
        pts_a = env_a.score(cat_a)
        
        # --- Agent B Turn ---
        rolls_b = [list(env_b.current_dice)]
        while env_b.roll_count < 3:
            avail_b = env_b.get_available_categories()
            holds_b = agent_b.decide_hold(env_b.current_dice, env_b.roll_count, avail_b)
            if all(holds_b):
                break
            env_b.roll(holds_b)
            rolls_b.append(list(env_b.current_dice))
        cat_b = agent_b.decide_category(list(env_b.current_dice), env_b.roll_count, env_b.get_available_categories())
        pts_b = env_b.score(cat_b)
        
        rounds_log.append({
            "round": r,
            "a_rolls": rolls_a,
            "a_cat": cat_a,
            "a_pts": pts_a,
            "a_total": env_a.total_score,
            "b_rolls": rolls_b,
            "b_cat": cat_b,
            "b_pts": pts_b,
            "b_total": env_b.total_score,
            "leader": "A" if env_a.total_score > env_b.total_score else ("B" if env_b.total_score > env_a.total_score else "TIE")
        })
        
    score_a = env_a.total_score
    score_b = env_b.total_score
    
    if score_a > score_b:
        winner = "A"
    elif score_b > score_a:
        winner = "B"
    else:
        winner = "DRAW"
        
    return {
        "winner": winner,
        "score_a": score_a,
        "score_b": score_b,
        "diff": abs(score_a - score_b),
        "upper_bonus_a": env_a.upper_bonus,
        "upper_bonus_b": env_b.upper_bonus,
        "board_a": env_a.score_board,
        "board_b": env_b.score_board,
        "rounds": rounds_log,
    }


def format_dramatic_match_narrative(match_res: Dict, name_a: str = "Fly-Alpha", name_b: str = "Fly-Beta") -> str:
    """Formats a turn-by-turn dramatic narrative of the 1v1 duel."""
    lines = []
    lines.append("=" * 70)
    lines.append(f" ⚔️ [1v1 YACHT SHOWDOWN] {name_a} vs {name_b}")
    lines.append("=" * 70)
    
    lead_changes = 0
    prev_leader = "TIE"
    
    for log in match_res["rounds"]:
        r = log["round"]
        curr_leader = log["leader"]
        if curr_leader != "TIE" and curr_leader != prev_leader and prev_leader != "TIE":
            lead_changes += 1
            lead_mark = "⚡ [LEAD CHANGE!]"
        else:
            lead_mark = ""
            
        prev_leader = curr_leader
        
        lines.append(
            f"R{r:02d} | {name_a}: +{log['a_pts']:2d} ({log['a_cat']:<12}) [Total: {log['a_total']:3d}] vs "
            f"{name_b}: +{log['b_pts']:2d} ({log['b_cat']:<12}) [Total: {log['b_total']:3d}] | {lead_mark}"
        )
        
    lines.append("-" * 70)
    winner = match_res["winner"]
    if winner == "A":
        result_str = f"🏆 WINNER: {name_a}! (+{match_res['diff']} pts victory margin)"
    elif winner == "B":
        result_str = f"🏆 WINNER: {name_b}! (+{match_res['diff']} pts victory margin)"
    else:
        result_str = "🤝 RESULT: DRAMATIC DRAW!"
        
    lines.append(f"FINAL SCORE: {name_a} {match_res['score_a']} vs {match_res['score_b']} {name_b} | Lead Changes: {lead_changes}")
    lines.append(result_str)
    lines.append("=" * 70)
    return "\n".join(lines)
