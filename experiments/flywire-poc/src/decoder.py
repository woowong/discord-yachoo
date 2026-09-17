from collections import Counter
from typing import List, Tuple
import numpy as np
from yacht_env import CATEGORIES, ScoreCategory


def decode_hold_mask(
    mbon_firing_counts: np.ndarray,
    dice: List[int] | None = None,
    threshold: float = 0.5
) -> List[bool]:
    """
    Decodes MBON [0..4] into biological Behavioral Drives (Action Primitives):
    - MBON 0: Multiples Drive (hold pairs, triples, four-of-a-kind)
    - MBON 1: Straight Sequence Drive (hold sequential runs)
    - MBON 2: High-Value Drive (hold 5s and 6s)
    - MBON 3: Exploration Drive (reroll all 5 dice)
    - MBON 4: Harvest / Freeze Drive (lock in current dice, stop rerolling)
    
    If dice is None or pure slot mask is requested, falls back to direct thresholding.
    """
    assert len(mbon_firing_counts) >= 5, f"Expected at least 5 MBONs, got {len(mbon_firing_counts)}"
    drive_counts = mbon_firing_counts[:5]
    
    if dice is None:
        # Fallback slot-based decoding
        if np.max(drive_counts) == np.min(drive_counts):
            return [False, False, False, False, False]
        avg_firing = np.mean(drive_counts)
        return [bool(c > avg_firing) for c in drive_counts]
        
    # Biological Behavioral Drive Selection
    # If all drive neurons are completely silent or uniform, choose Exploration
    if np.max(drive_counts) == np.min(drive_counts):
        best_drive = 3  # Explore
    else:
        best_drive = int(np.argmax(drive_counts))
        
    counts = Counter(dice)
    if best_drive == 0:
        # Multiples Drive: hold highest multiplicity dice
        max_c = max(counts.values())
        if max_c > 1:
            best_vals = [val for val, c in counts.items() if c == max_c]
            target_val = max(best_vals)  # pick higher value if two pairs
            return [d == target_val for d in dice]
        else:
            return [d in (5, 6) for d in dice]
            
    elif best_drive == 1:
        # Straight Sequence Drive: hold longest contiguous run
        best_run = set()
        for start in [1, 2, 3]:
            candidate = set(range(start, start + 4))
            common = candidate.intersection(dice)
            if len(common) > len(best_run):
                best_run = common
        return [d in best_run for d in dice]
        
    elif best_drive == 2:
        # High-Value Drive: hold 5s and 6s
        return [d in (5, 6) for d in dice]
        
    elif best_drive == 3:
        # Exploration Drive: reroll all
        return [False, False, False, False, False]
        
    else:
        # Harvest / Freeze Drive: lock in all
        return [True, True, True, True, True]


def decode_category_selection(
    mbon_firing_counts: np.ndarray,
    available_categories: List[ScoreCategory],
    seed: int | None = None
) -> ScoreCategory:
    """
    Decodes MBON 5..16 into exactly one valid and currently available ScoreCategory.
    Applies strict masking so that already-filled categories are never selected.
    Uses small random jitter to break ties fairly without bias toward the first category.
    """
    assert len(mbon_firing_counts) >= 17, f"Expected at least 17 MBONs, got {len(mbon_firing_counts)}"
    assert len(available_categories) > 0, "No available categories left!"
    
    cat_counts = mbon_firing_counts[5:17].astype(np.float32).copy()
    avail_set = set(available_categories)
    
    rng = np.random.default_rng(seed)
    jitter = rng.uniform(0.0001, 0.001, size=len(CATEGORIES))
    
    for idx, cat in enumerate(CATEGORIES):
        if cat not in avail_set:
            cat_counts[idx] = -1e9  # Mask out completely
        else:
            cat_counts[idx] += jitter[idx]
            
    best_idx = int(np.argmax(cat_counts))
    selected = CATEGORIES[best_idx]
    
    if selected not in avail_set:
        selected = available_categories[0]
        
    return selected
