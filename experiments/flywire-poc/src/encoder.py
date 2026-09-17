from typing import List, Set
import numpy as np
from yacht_env import CATEGORIES, ScoreCategory


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
    - PN [33..44]: 12 Categories availability mask
    - PN [45..49]: Reserved (currently 0.0)
    """
    assert len(dice) == 5, f"Expected 5 dice, got {len(dice)}"
    assert 1 <= roll_count <= 3, f"Expected roll_count 1..3, got {roll_count}"
    
    currents = np.zeros(num_pn, dtype=np.float32)
    
    # 1. Encode dice
    for slot, val in enumerate(dice):
        assert 1 <= val <= 6, f"Invalid dice value: {val}"
        pn_idx = slot * 6 + (val - 1)
        currents[pn_idx] = dice_amp
        
    # 2. Encode roll count
    roll_idx = 30 + (roll_count - 1)
    currents[roll_idx] = roll_amp
    
    # 3. Encode available categories
    avail_set: Set[ScoreCategory] = set(available_categories)
    for cat_idx, cat in enumerate(CATEGORIES):
        if cat in avail_set:
            currents[33 + cat_idx] = cat_amp
            
    return currents
