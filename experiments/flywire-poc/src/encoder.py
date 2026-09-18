from collections import Counter
from typing import List, Set
import numpy as np
from yacht_env import CATEGORIES, ScoreCategory, calculate_score


def encode_state_to_pn(
    dice: List[int],
    roll_count: int,
    available_categories: List[ScoreCategory],
    num_pn: int = 50,
    dice_amp: float = 2.0,
    roll_amp: float = 1.5,
    cat_amp: float = 1.0,
) -> np.ndarray:
    """
    Encodes the current Yacht state into input current for Projection Neurons (PNs):
    - PN [0..29]:  5 dice x 6 values (One-hot per dice slot)
    - PN [30..32]: Roll count (1st roll, 2nd roll, 3rd roll)
    - PN [33..44]: 12 Categories availability with Sensory Affordance (prospective point yield)
    - PN [45..49]: High-level pattern feature detectors:
        * PN 45: Max duplicate count (pair, triple, 4-kind, yacht)
        * PN 46: Full house indicator
        * PN 47: Straight length (longest sequence)
        * PN 48: Normalized dice sum
        * PN 49: High dice count (number of 5s and 6s)
    """
    assert len(dice) == 5, f"Expected 5 dice, got {len(dice)}"
    assert 1 <= roll_count <= 3, f"Expected roll_count 1..3, got {roll_count}"
    
    if num_pn == 100:
        base_currents = encode_state_to_pn(
            dice, roll_count, available_categories, num_pn=50,
            dice_amp=dice_amp, roll_amp=roll_amp, cat_amp=cat_amp
        )
        currents_100 = np.zeros(100, dtype=np.float32)
        currents_100[:50] = base_currents
        currents_100[50:] = base_currents
        return currents_100
        
    currents = np.zeros(num_pn, dtype=np.float32)
    
    # 1. Encode dice slots
    for slot, val in enumerate(dice):
        assert 1 <= val <= 6, f"Invalid dice value: {val}"
        pn_idx = slot * 6 + (val - 1)
        currents[pn_idx] = dice_amp
        
    # 2. Encode roll count
    roll_idx = 30 + (roll_count - 1)
    currents[roll_idx] = roll_amp
    
    # 3. Encode available categories with Sensory Affordance (prospective points)
    avail_set: Set[ScoreCategory] = set(available_categories)
    for cat_idx, cat in enumerate(CATEGORIES):
        if cat in avail_set:
            pts = calculate_score(cat, dice)
            # Base current + proportional affordance yield
            currents[33 + cat_idx] = cat_amp + (pts / 50.0) * 2.0
            
    # 4. Sensory feature detectors (PN 45..49) with Satiety Gating
    if num_pn >= 50:
        counts = Counter(dice)
        freq_vals = sorted(counts.values(), reverse=True)
        max_kind = freq_vals[0]
        is_full_house = (freq_vals == [3, 2] or freq_vals == [5])
        
        # Straight detection
        unique_sorted = sorted(set(dice))
        max_seq = 1
        curr_seq = 1
        for i in range(len(unique_sorted) - 1):
            if unique_sorted[i+1] == unique_sorted[i] + 1:
                curr_seq += 1
                max_seq = max(max_seq, curr_seq)
            else:
                curr_seq = 1
                
        dice_sum = sum(dice)
        high_dice = sum(1 for d in dice if d in (5, 6))
        
        has_full_house_avail = "FullHouse" in avail_set
        has_straight_avail = ("SmallStraight" in avail_set) or ("LargeStraight" in avail_set)

        currents[45] = (max_kind / 5.0) * 2.0
        currents[46] = 2.0 if (is_full_house and has_full_house_avail) else 0.0
        currents[47] = (max_seq / 5.0) * 2.0 if has_straight_avail else 0.0
        currents[48] = (dice_sum / 30.0) * 2.0
        currents[49] = (high_dice / 5.0) * 2.0
        
    return currents

