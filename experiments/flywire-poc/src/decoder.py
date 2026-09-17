from typing import List, Tuple
import numpy as np
from yacht_env import CATEGORIES, ScoreCategory


def decode_hold_mask(
    mbon_firing_counts: np.ndarray,
    threshold: float = 0.5
) -> List[bool]:
    """
    Decodes the first 5 MBONs (MBON 0..4) into a 5-element dice hold mask:
    True = keep dice, False = reroll dice.
    """
    assert len(mbon_firing_counts) >= 5, f"Expected at least 5 MBONs, got {len(mbon_firing_counts)}"
    hold_counts = mbon_firing_counts[:5]
    
    # If no spikes fired at all in hold neurons, reroll all (or keep all based on median)
    if np.max(hold_counts) == 0:
        return [False, False, False, False, False]
        
    # Relative threshold: if firing count is greater than or equal to the average of hold neurons
    avg_firing = np.mean(hold_counts)
    return [bool(c >= max(threshold, avg_firing)) for c in hold_counts]


def decode_category_selection(
    mbon_firing_counts: np.ndarray,
    available_categories: List[ScoreCategory],
    seed: int | None = None
) -> ScoreCategory:
    """
    Decodes MBON 5..16 into exactly one valid and currently available ScoreCategory.
    Applies strict masking so that already-filled categories are never selected.
    """
    assert len(mbon_firing_counts) >= 17, f"Expected at least 17 MBONs, got {len(mbon_firing_counts)}"
    assert len(available_categories) > 0, "No available categories left!"
    
    cat_counts = mbon_firing_counts[5:17].astype(np.float32).copy()
    
    # Mask unavailable categories
    avail_set = set(available_categories)
    for idx, cat in enumerate(CATEGORIES):
        if cat not in avail_set:
            cat_counts[idx] = -1e9  # Mask out completely
            
    # Find category with maximum activity among available
    best_idx = int(np.argmax(cat_counts))
    selected = CATEGORIES[best_idx]
    
    # Safety check: must be in available_categories
    if selected not in avail_set:
        selected = available_categories[0]
        
    return selected
