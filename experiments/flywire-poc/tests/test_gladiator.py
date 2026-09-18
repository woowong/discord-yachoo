import sys
from pathlib import Path
import pytest

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from gladiator_tournament import evaluate_agent_gladiator, run_gladiator_tournament
from agent import RandomAgent


def test_gladiator_evaluation_quick():
    agent = RandomAgent()
    results = evaluate_agent_gladiator(agent, num_games=3, agent_name="TestRandom", verbose=False)
    assert results["num_games"] == 3
    assert "mean_score" in results
    assert "redundant_pattern_fixation_rate" in results
    assert 0.0 <= results["redundant_pattern_fixation_rate"] <= 1.0


def test_historical_match_1pisssm_straight_preservation():
    """
    Replay match 1pisssm critical decision point: [1, 3, 5, 4, 6] roll.
    Verify that FlyBrainAgent v3 holds the 4-die open straight ([3, 5, 4, 6])
    rather than collapsing into pair or high-dice fixation.
    """
    import numpy as np
    from forward_sim import FlySubcircuitSNN, load_cached_subcircuit
    from synaptic_plasticity import set_kc_mbon_dense
    from agent import FlyBrainAgent

    base_adj, base_meta = load_cached_subcircuit()
    v3_weights_path = Path(__file__).resolve().parent.parent / "data" / "champion_fly_v3_weights.npz"
    if not v3_weights_path.exists():
        pytest.skip("champion_fly_v3_weights.npz not found")

    v3_data = np.load(v3_weights_path)
    v3_w = v3_data["weights"] if "weights" in v3_data else v3_data["kc_mbon_weights"]
    adj = set_kc_mbon_dense(base_adj, base_meta, v3_w, preserve_topology=True)
    snn = FlySubcircuitSNN(adj, base_meta)
    agent = FlyBrainAgent(snn=snn, enable_dan_modulation=True)

    test_dice = [1, 3, 5, 4, 6]
    avail_cats = ["SmallStraight", "LargeStraight", "Aces", "Fours", "Fives", "Sixes", "Choice"]
    holds = agent.decide_hold(test_dice, roll_count=1, available_categories=avail_cats)
    held_dice = [d for d, h in zip(test_dice, holds) if h]

    # Verify that the open straight run {3, 4, 5, 6} is preserved
    assert set(held_dice) == {3, 4, 5, 6}
    assert holds == [False, True, True, True, True]

