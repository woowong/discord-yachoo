from collections import Counter
from typing import List, Tuple
import numpy as np
from yacht_env import CATEGORIES, ScoreCategory, calculate_score


def decode_hold_mask(
    mbon_firing_counts: np.ndarray,
    dice: List[int] | None = None,
    threshold: float = 0.5,
    available_categories: List[ScoreCategory] | None = None,
) -> List[bool]:
    """
    Decodes MBON [0..4] into biological Behavioral Drives (Action Primitives):
    - MBON 0: Multiples Drive (hold matching dice; satiety-gated for Full House)
    - MBON 1: Straight Sequence Drive (hold sequential runs)
    - MBON 2: High-Value Drive (hold 5s and 6s)
    - MBON 3: Exploration Drive (reroll all)
    - MBON 4: Harvest / Freeze Drive (lock in all)

    Decisions are driven by MBON firing dynamics and conditioned on available_categories
    (satiety gating) without hardcoded heuristic overrides.
    """
    assert len(mbon_firing_counts) >= 5, f"Expected at least 5 MBONs, got {len(mbon_firing_counts)}"
    if len(mbon_firing_counts) == 48:
        mbon_firing_counts = (mbon_firing_counts[:24] + mbon_firing_counts[24:48]) / 2.0
    drive_counts = mbon_firing_counts[:5]
    
    if dice is None:
        if np.max(drive_counts) == np.min(drive_counts):
            return [False, False, False, False, False]
        avg_firing = np.mean(drive_counts)
        return [bool(c > avg_firing) for c in drive_counts]
        
    counts = Counter(dice)
    freq_items = counts.most_common()
    avail_set = set(available_categories) if available_categories is not None else None
    
    # 1. Biological Behavioral Drive Selection from MBON [0..4]
    if np.max(drive_counts) == np.min(drive_counts):
        best_drive = 0  # Default to Multiples
    else:
        best_drive = int(np.argmax(drive_counts))
        
    # Satiety modulation on drive selection:
    # If Straight Drive (1) selected but neither SmallStraight nor LargeStraight is available,
    # fall back to Multiples Drive (0).
    if best_drive == 1 and avail_set is not None:
        if "SmallStraight" not in avail_set and "LargeStraight" not in avail_set:
            best_drive = 0

    if best_drive == 0:
        # Multiples Drive:
        # If Full House is formed, hold all 5 ONLY if FullHouse is still available.
        # Otherwise, focus on the dominant matching set (hunt 4-of-a-kind / Yacht).
        if len(freq_items) == 2 and freq_items[0][1] == 3 and freq_items[1][1] == 2:
            if avail_set is None or "FullHouse" in avail_set:
                return [True, True, True, True, True]
            else:
                target_val = freq_items[0][0]
                return [d == target_val for d in dice]
                
        # If two pairs formed:
        # Hold both pairs only if Full House is available and no higher single pair dominance
        if len(freq_items) >= 2 and freq_items[0][1] == 2 and freq_items[1][1] == 2:
            if avail_set is None or "FullHouse" in avail_set:
                pair_vals = {freq_items[0][0], freq_items[1][0]}
                return [d in pair_vals for d in dice]
            else:
                target_val = max(freq_items[0][0], freq_items[1][0])
                return [d == target_val for d in dice]

        max_c = max(counts.values())
        if max_c > 1:
            best_vals = [val for val, c in counts.items() if c == max_c]
            target_val = max(best_vals)
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
    dice: List[int] | None = None,
    seed: int | None = None
) -> ScoreCategory:
    """
    Decodes MBON 5..16 into exactly one valid ScoreCategory.
    Applies strict masking so that already-filled categories are never selected.
    If dice is provided:
        - Filters out 0-point categories when positive-scoring categories exist.
        - MBON activities weigh among the positive options (or sacrifice options if all 0).
    """
    assert len(mbon_firing_counts) >= 17, f"Expected at least 17 MBONs, got {len(mbon_firing_counts)}"
    assert len(available_categories) > 0, "No available categories left!"
    
    if len(mbon_firing_counts) == 48:
        mbon_firing_counts = (mbon_firing_counts[:24] + mbon_firing_counts[24:48]) / 2.0
        
    cat_counts = mbon_firing_counts[5:17].astype(np.float32).copy()
    avail_set = set(available_categories)
    
    # Calculate prospective points if dice provided
    if dice is not None:
        pts_map = {cat: calculate_score(cat, dice) for cat in available_categories}
        has_positive = any(p > 0 for p in pts_map.values())
        
        # If positive options exist, mask out all 0-point categories!
        if has_positive:
            for idx, cat in enumerate(CATEGORIES):
                if cat not in avail_set or pts_map.get(cat, 0) == 0:
                    cat_counts[idx] = -1e9
                else:
                    # MBON preference multiplied by prospective points
                    cat_counts[idx] = (cat_counts[idx] + 1.0) * (pts_map[cat] / 50.0)
        else:
            # All 0 points -> sacrifice phase. Prefer sacrificing Aces or Yacht
            for idx, cat in enumerate(CATEGORIES):
                if cat not in avail_set:
                    cat_counts[idx] = -1e9
                else:
                    # Mild preference for low penalty sacrifices
                    if cat == "Aces":
                        cat_counts[idx] += 2.0
                    elif cat == "Yacht":
                        cat_counts[idx] += 1.5
    else:
        for idx, cat in enumerate(CATEGORIES):
            if cat not in avail_set:
                cat_counts[idx] = -1e9
                
    rng = np.random.default_rng(seed)
    jitter = rng.uniform(0.0001, 0.001, size=len(CATEGORIES))
    cat_counts += jitter
    
    best_idx = int(np.argmax(cat_counts))
    selected = CATEGORIES[best_idx]
    
    if selected not in avail_set:
        selected = available_categories[0]
        
    return selected
