import sys
from pathlib import Path
import numpy as np
import pytest

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from encoder import encode_state_to_pn
from decoder import decode_hold_mask, decode_category_selection
from yacht_env import CATEGORIES, ScoreCategory


def test_encoder_affordance_injection():
    # Dice: [6, 6, 6, 6, 6] -> Yacht yields 50, Sixes yields 30, Aces yields 0
    dice = [6, 6, 6, 6, 6]
    roll_count = 1
    avail = ["Yacht", "Sixes", "Aces"]
    
    currents = encode_state_to_pn(dice, roll_count, avail, cat_amp=1.0)
    
    # Yacht is category index 11 -> PN 33 + 11 = 44
    yacht_pn = 33 + CATEGORIES.index("Yacht")
    sixes_pn = 33 + CATEGORIES.index("Sixes")
    aces_pn = 33 + CATEGORIES.index("Aces")
    deuces_pn = 33 + CATEGORIES.index("Deuces")
    
    # Yacht: 1.0 + (50 / 50.0) * 2.0 = 3.0
    assert np.isclose(currents[yacht_pn], 3.0)
    # Sixes: 1.0 + (30 / 50.0) * 2.0 = 2.2
    assert np.isclose(currents[sixes_pn], 2.2)
    # Aces: 1.0 + (0 / 50.0) * 2.0 = 1.0 (available, but 0 points)
    assert np.isclose(currents[aces_pn], 1.0)
    # Deuces: not in avail -> 0.0
    assert np.isclose(currents[deuces_pn], 0.0)


def test_decoder_pattern_preservation():
    fake_mbon = np.zeros(20)  # drives don't fire
    
    # 1. Full House formed -> hold all 5
    holds = decode_hold_mask(fake_mbon, dice=[2, 2, 5, 5, 5])
    assert holds == [True, True, True, True, True]
    
    # 2. Yacht formed -> hold all 5
    holds = decode_hold_mask(fake_mbon, dice=[3, 3, 3, 3, 3])
    assert holds == [True, True, True, True, True]
    
    # 3. 4 of a kind -> hold the four matching dice
    holds = decode_hold_mask(fake_mbon, dice=[4, 4, 1, 4, 4])
    assert holds == [True, True, False, True, True]
    
    # 4. Two pairs -> hold both pairs, reroll fifth
    holds = decode_hold_mask(fake_mbon, dice=[3, 1, 5, 3, 5])
    assert holds == [True, False, True, True, True]


def test_decoder_zero_yield_filtering():
    # MBON activity heavily biases towards Yacht (cat idx 11, which is MBON idx 5 + 11 = 16)
    mbon_counts = np.zeros(20)
    mbon_counts[16] = 100  # Yacht MBON
    mbon_counts[5 + CATEGORIES.index("Sixes")] = 10  # Sixes MBON
    
    avail = ["Yacht", "Sixes", "Aces"]
    dice = [6, 6, 6, 2, 3]  # Yacht: 0 pts, Sixes: 18 pts, Aces: 0 pts
    
    # Since Sixes yields 18 > 0 and Yacht yields 0, Yacht must be filtered out!
    selected = decode_category_selection(mbon_counts, avail, dice=dice)
    assert selected == "Sixes"


def test_decoder_sacrifice_fallback():
    # If all available yield 0, sacrifice fallback is triggered gracefully
    mbon_counts = np.zeros(20)
    avail = ["Aces", "Deuces"]
    dice = [3, 4, 5, 6, 3]  # Aces: 0 pts, Deuces: 0 pts
    
    selected = decode_category_selection(mbon_counts, avail, dice=dice)
    assert selected in avail


def test_encoder_satiety_silencing():
    # Dice forms Full House: [2, 2, 5, 5, 5]
    dice = [2, 2, 5, 5, 5]
    roll_count = 1

    # Case A: FullHouse is available -> PN 46 active
    currents_avail = encode_state_to_pn(dice, roll_count, ["FullHouse", "Aces"])
    assert currents_avail[46] == 2.0

    # Case B: FullHouse is already consumed -> PN 46 silenced (0.0)
    currents_satiated = encode_state_to_pn(dice, roll_count, ["Fives", "Deuces", "Choice"])
    assert currents_satiated[46] == 0.0

