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
