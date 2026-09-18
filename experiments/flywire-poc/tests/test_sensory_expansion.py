import sys
from pathlib import Path
import numpy as np
import pytest

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from encoder import encode_state_to_pn
from yacht_env import CATEGORIES, UPPER_CATEGORIES


def test_encoder_shapes_and_symmetry():
    dice = [1, 2, 3, 4, 5]
    avail = list(CATEGORIES)

    # 64 PN unilateral
    c64 = encode_state_to_pn(dice, roll_count=1, available_categories=avail, num_pn=64)
    assert c64.shape == (64,)
    assert c64.dtype == np.float32

    # 128 PN bilateral
    c128 = encode_state_to_pn(dice, roll_count=1, available_categories=avail, num_pn=128)
    assert c128.shape == (128,)
    np.testing.assert_array_equal(c128[:64], c128[64:])

    # 50 PN legacy
    c50 = encode_state_to_pn(dice, roll_count=1, available_categories=avail, num_pn=50)
    assert c50.shape == (50,)


def test_straight_radar_and_open_vs_gutshot():
    avail = ["SmallStraight", "LargeStraight", "Choice"]

    # 1. Open-ended large straight candidate: [2, 3, 4, 5, 1]
    # In dice [2, 3, 4, 5, 2]: contains {2, 3, 4, 5}
    dice_open = [2, 3, 4, 5, 2]
    c_open = encode_state_to_pn(dice_open, roll_count=1, available_categories=avail, num_pn=64)
    assert c_open[52] == 2.0  # has 4-run
    assert c_open[53] == 2.0  # {2,3,4,5} bidirectional tension
    assert c_open[56] == 2.0  # open-ended indicator

    # 2. Gutshot candidate: [2, 3, 5, 6, 2] -> missing 4
    dice_gut = [2, 3, 5, 6, 2]
    c_gut = encode_state_to_pn(dice_gut, roll_count=1, available_categories=avail, num_pn=64)
    assert c_gut[52] == 1.5  # near-miss gutshot
    assert c_gut[53] == 0.0  # not open-ended
    assert c_gut[56] == 1.0  # gutshot indicator

    # 3. No straight available: satiety silence
    avail_no_straight = ["Choice", "Aces"]
    c_none = encode_state_to_pn(dice_open, roll_count=1, available_categories=avail_no_straight, num_pn=64)
    assert c_none[52] == 0.0
    assert c_none[53] == 0.0
    assert c_none[56] == 0.0


def test_upper_deficit_and_feasibility():
    dice = [6, 6, 5, 5, 4]
    avail = ["Aces", "Deuces", "Treys", "Fours", "Fives", "Sixes"]

    # At game start: upper_sum = 0 -> deficit = max(0, 63-0)/63 * 2.0 = 2.0
    c_start = encode_state_to_pn(dice, roll_count=1, available_categories=avail, num_pn=64,
                                 score_board={cat: None for cat in CATEGORIES})
    assert np.isclose(c_start[50], 2.0)
    assert c_start[51] > 1.0  # Feasible (all upper categories available)

    # Upper bonus achieved: upper_sum = 65 -> deficit = 0
    score_board_won = {cat: None for cat in CATEGORIES}
    score_board_won["Fours"] = 16
    score_board_won["Fives"] = 25
    score_board_won["Sixes"] = 24  # sum = 65
    avail_won = ["Aces", "Choice"]
    c_won = encode_state_to_pn(dice, roll_count=1, available_categories=avail_won, num_pn=64,
                               score_board=score_board_won)
    assert c_won[50] == 0.0
    assert c_won[51] == 2.0


def test_economic_and_pvp_features():
    dice = [1, 2, 3, 4, 5]
    avail = ["Aces", "Choice"]
    score_board = {cat: None for cat in CATEGORIES}
    score_board["Choice"] = None
    score_board["Aces"] = None

    # Sacrifice airbag: Aces remaining -> 1/2 * 2.0 = 1.0
    c = encode_state_to_pn(dice, roll_count=2, available_categories=avail, num_pn=64,
                           score_board=score_board, opponent_score=150)
    assert np.isclose(c[59], 1.0)
    assert c[60] == 2.0  # Choice available
    assert c[61] > 0.5  # variance of [1,2,3,4,5] is positive
    # PvP margin against strong opponent
    assert 0.0 <= c[62] <= 2.0
    # Greed: roll 2, round 11 -> remaining rolls 1, rounds 2
    assert 0.0 < c[63] < 2.0


def test_straight_drive_hold_uniqueness():
    from decoder import decode_hold_mask

    # MBON 1 fires highest -> Straight Sequence Drive
    mbon_spikes = np.zeros(24)
    mbon_spikes[1] = 10.0  # Straight Drive

    # 1. Match 1pisssm roll [1, 3, 5, 4, 6]: should hold 3, 4, 5, 6 and release 1
    holds = decode_hold_mask(mbon_spikes, dice=[1, 3, 5, 4, 6], available_categories=["LargeStraight", "SmallStraight"])
    assert sum(holds) == 4
    assert holds[0] is False  # 1 is released

    # 2. Pair with straight potential [3, 3, 4, 5, 6]: should hold one 3 and release the duplicate 3
    holds_pair = decode_hold_mask(mbon_spikes, dice=[3, 3, 4, 5, 6], available_categories=["LargeStraight"])
    assert sum(holds_pair) == 4
    assert holds_pair[0] != holds_pair[1]  # one 3 held, one released

    # 3. Complete Large Straight [1, 2, 3, 4, 5]: hold all 5
    holds_complete = decode_hold_mask(mbon_spikes, dice=[1, 2, 3, 4, 5], available_categories=["LargeStraight"])
    assert holds_complete == [True, True, True, True, True]

