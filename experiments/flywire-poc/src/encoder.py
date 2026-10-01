from collections import Counter
from typing import Dict, List, Optional, Set
import numpy as np
from yacht_env import CATEGORIES, UPPER_CATEGORIES, ScoreCategory, calculate_score

UPPER_MAX_SCORES = {
    "Aces": 5,
    "Deuces": 10,
    "Treys": 15,
    "Fours": 20,
    "Fives": 25,
    "Sixes": 30,
}


def encode_state_to_pn(
    dice: List[int],
    roll_count: int,
    available_categories: List[ScoreCategory],
    num_pn: int = 64,
    dice_amp: float = 2.0,
    roll_amp: float = 1.5,
    cat_amp: float = 1.0,
    round_num: Optional[int] = None,
    score_board: Optional[Dict[ScoreCategory, Optional[int]]] = None,
    opponent_score: Optional[int] = None,
) -> np.ndarray:
    """
    Encodes the current Yacht state into input current for Projection Neurons (PNs):
    - PN [0..29]:  5 dice x 6 values (One-hot per dice slot)
    - PN [30..32]: Roll count (1st roll, 2nd roll, 3rd roll)
    - PN [33..44]: 12 Categories availability with Sensory Affordance (prospective point yield)
    - PN [45..49]: High-level pattern feature detectors:
        * PN 45: Max duplicate count (pair, triple, 4-kind, yacht)
        * PN 46: Full house indicator (satiety-gated)
        * PN 47: Straight length (longest sequence, satiety-gated)
        * PN 48: Normalized dice sum
        * PN 49: High dice count (number of 5s and 6s)
    - PN [50..55]: Interoception, upper deficit, and pace clock:
        * PN 50: Upper bonus deficit max(0, 63 - UpperSum) / 63
        * PN 51: Upper bonus feasibility indicator
        * PN 52: Straight near-miss potential radar (inside/outside gap)
        * PN 53: Bidirectional open straight tension
        * PN 54: High dice upper preservation urgency
        * PN 55: Game pace clock (round progression T / 12)
    - PN [56..63]: Advanced topological, economic, and PvP context:
        * PN 56: Open Straight vs Gutshot Gap indicator (open 2.0, one-end 1.5, gutshot 1.0)
        * PN 57: Upper High-Trio Health (points in Fours, Fives, Sixes / 45.0)
        * PN 58: Upper Pace Velocity (UpperSum / 63 - Round / 12)
        * PN 59: Sacrifice Airbag Availability (Aces/Deuces remaining for defense)
        * PN 60: Choice Safety Shield (Choice category availability)
        * PN 61: Dice Variance / Chaos (normalized variance Var / 3.5)
        * PN 62: Score Lead / Deficit Margin (PvP delta tanh)
        * PN 63: Exploration Freedom / Greed Gauge (remaining rolls x remaining rounds)
    """
    assert len(dice) == 5, f"Expected 5 dice, got {len(dice)}"
    assert 1 <= roll_count <= 3, f"Expected roll_count 1..3, got {roll_count}"

    # Bilateral hemisphere mirroring
    if num_pn == 128:
        base_currents = encode_state_to_pn(
            dice, roll_count, available_categories, num_pn=64,
            dice_amp=dice_amp, roll_amp=roll_amp, cat_amp=cat_amp,
            round_num=round_num, score_board=score_board, opponent_score=opponent_score,
        )
        currents_128 = np.zeros(128, dtype=np.float32)
        currents_128[:64] = base_currents
        currents_128[64:] = base_currents
        return currents_128

    if num_pn == 100:
        base_currents = encode_state_to_pn(
            dice, roll_count, available_categories, num_pn=50,
            dice_amp=dice_amp, roll_amp=roll_amp, cat_amp=cat_amp,
            round_num=round_num, score_board=score_board, opponent_score=opponent_score,
        )
        currents_100 = np.zeros(100, dtype=np.float32)
        currents_100[:50] = base_currents
        currents_100[50:] = base_currents
        return currents_100

    currents = np.zeros(num_pn, dtype=np.float32)
    avail_set: Set[ScoreCategory] = set(available_categories)

    # 1. Encode dice slots
    for slot, val in enumerate(dice):
        assert 1 <= val <= 6, f"Invalid dice value: {val}"
        pn_idx = slot * 6 + (val - 1)
        currents[pn_idx] = dice_amp

    # 2. Encode roll count
    roll_idx = 30 + (roll_count - 1)
    currents[roll_idx] = roll_amp

    # 3. Encode available categories with Sensory Affordance (prospective points)
    for cat_idx, cat in enumerate(CATEGORIES):
        if cat in avail_set:
            pts = calculate_score(cat, dice)
            currents[33 + cat_idx] = cat_amp + (pts / 50.0) * 2.0

    # 4. Sensory feature detectors (PN 45..49) with Satiety Gating
    counts = Counter(dice)
    freq_vals = sorted(counts.values(), reverse=True)
    max_kind = freq_vals[0]
    is_full_house = (freq_vals == [3, 2] or freq_vals == [5])

    unique_sorted = sorted(set(dice))
    unique_set = set(unique_sorted)
    max_seq = 1
    curr_seq = 1
    for i in range(len(unique_sorted) - 1):
        if unique_sorted[i + 1] == unique_sorted[i] + 1:
            curr_seq += 1
            max_seq = max(max_seq, curr_seq)
        else:
            curr_seq = 1

    dice_sum = sum(dice)
    high_dice = sum(1 for d in dice if d in (5, 6))

    has_full_house_avail = "FullHouse" in avail_set
    has_straight_avail = ("SmallStraight" in avail_set) or ("LargeStraight" in avail_set)

    if num_pn >= 50:
        currents[45] = (max_kind / 5.0) * 2.0
        currents[46] = 2.0 if (is_full_house and has_full_house_avail) else 0.0
        currents[47] = (max_seq / 5.0) * 2.0 if has_straight_avail else 0.0
        currents[48] = (dice_sum / 30.0) * 2.0
        currents[49] = (high_dice / 5.0) * 2.0

    # 5. Extended Interoception and Game Pace (PN 50..55)
    if num_pn >= 56:
        # Determine round and upper score
        current_round = round_num if round_num is not None else max(1, 13 - len(available_categories))
        
        if score_board is not None:
            upper_sum = sum(score_board[cat] or 0 for cat in UPPER_CATEGORIES)
            high_trio_sum = sum(score_board[cat] or 0 for cat in ("Fours", "Fives", "Sixes"))
            my_total = sum(pts for pts in score_board.values() if pts is not None)
        else:
            # Approximate from unavailable categories
            scored_cats = set(CATEGORIES) - avail_set
            scored_upper = [c for c in UPPER_CATEGORIES if c in scored_cats]
            upper_sum = sum(UPPER_MAX_SCORES[c] * 0.6 for c in scored_upper)
            high_trio_sum = sum(UPPER_MAX_SCORES[c] * 0.6 for c in ("Fours", "Fives", "Sixes") if c in scored_cats)
            my_total = upper_sum

        # PN 50: Upper deficit
        deficit = max(0.0, 63.0 - upper_sum)
        currents[50] = (deficit / 63.0) * 2.0

        # PN 51: Feasibility
        remaining_upper = [c for c in UPPER_CATEGORIES if c in avail_set]
        max_possible_upper = upper_sum + sum(UPPER_MAX_SCORES[c] for c in remaining_upper)
        if upper_sum >= 63:
            currents[51] = 2.0
        elif max_possible_upper >= 63:
            margin = (max_possible_upper - 63.0) / 20.0
            currents[51] = float(np.clip(1.0 + margin, 0.5, 2.0))
        else:
            currents[51] = 0.0

        # PN 52: Straight near-miss radar (inside/outside gap)
        # Check for 4-element straight patterns
        has_4_run = (
            {1, 2, 3, 4}.issubset(unique_set) or
            {2, 3, 4, 5}.issubset(unique_set) or
            {3, 4, 5, 6}.issubset(unique_set)
        )
        has_4_gutshot = (
            {1, 2, 4, 5}.issubset(unique_set) or
            {2, 3, 5, 6}.issubset(unique_set) or
            {1, 3, 4, 5}.issubset(unique_set) or
            {2, 4, 5, 6}.issubset(unique_set) or
            {1, 2, 3, 5}.issubset(unique_set) or
            {2, 4, 5, 6}.issubset(unique_set)
        )
        if has_straight_avail:
            if has_4_run:
                currents[52] = 2.0
            elif has_4_gutshot:
                currents[52] = 1.5
            elif max_seq >= 3:
                currents[52] = 1.0
            else:
                currents[52] = 0.0
        else:
            currents[52] = 0.0

        # PN 53: Bidirectional open straight tension
        if has_straight_avail:
            if {2, 3, 4, 5}.issubset(unique_set):
                currents[53] = 2.0
            elif {2, 3, 4}.issubset(unique_set) or {3, 4, 5}.issubset(unique_set):
                currents[53] = 1.2
            else:
                currents[53] = 0.0
        else:
            currents[53] = 0.0

        # PN 54: High dice upper preservation urgency
        high_in_upper = sum(1 for c in ("Fives", "Sixes") if c in avail_set)
        count_56 = sum(1 for d in dice if d in (5, 6))
        currents[54] = (high_in_upper / 2.0) * (count_56 / 5.0) * 2.0

        # PN 55: Game pace clock (T / 12)
        currents[55] = (current_round / 12.0) * 2.0

    # 6. Advanced Topological, Economic & PvP Sensory Extension (PN 56..63)
    if num_pn >= 64:
        # PN 56: Open Straight vs Gutshot Gap indicator
        if has_straight_avail:
            if {2, 3, 4, 5}.issubset(unique_set):
                currents[56] = 2.0
            elif {1, 2, 3, 4}.issubset(unique_set) or {3, 4, 5, 6}.issubset(unique_set):
                currents[56] = 1.5
            elif has_4_gutshot:
                currents[56] = 1.0
            else:
                currents[56] = 0.0
        else:
            currents[56] = 0.0

        # PN 57: Upper High-Trio Health (Fours, Fives, Sixes points / 45.0)
        currents[57] = float(np.clip((high_trio_sum / 45.0) * 2.0, 0.0, 2.0))

        # PN 58: Upper Pace Velocity (UpperSum / 63 - Round / 12)
        vel = (upper_sum / 63.0) - (current_round / 12.0)
        currents[58] = float(np.clip((vel + 0.5) * 2.0, 0.0, 2.0))

        # PN 59: Sacrifice Airbag Availability (Aces / Deuces remaining)
        airbags = sum(1 for c in ("Aces", "Deuces") if c in avail_set)
        currents[59] = (airbags / 2.0) * 2.0

        # PN 60: Choice Safety Shield
        currents[60] = 2.0 if "Choice" in avail_set else 0.0

        # PN 61: Dice Variance / Chaos (Var / 3.5)
        var_norm = float(np.var(dice)) / 3.5
        currents[61] = float(np.clip(var_norm * 2.0, 0.0, 2.0))

        # PN 62: Score Lead / Deficit Margin (PvP context)
        if opponent_score is not None:
            delta = float(my_total - opponent_score)
            margin = float(np.tanh(delta / 50.0))
            currents[62] = float(np.clip(margin + 1.0, 0.0, 2.0))
        else:
            currents[62] = 1.0  # Neutral baseline for solitaire

        # PN 63: Exploration Freedom / Greed Gauge
        rem_rolls = 3 - roll_count
        rem_rounds = 13 - current_round
        greed = (rem_rolls * rem_rounds) / 24.0
        currents[63] = float(np.clip(greed * 2.0, 0.0, 2.0))

    return currents
