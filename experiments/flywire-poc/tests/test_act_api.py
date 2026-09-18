import sys
from pathlib import Path
import pytest

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from web_server import ConnectomeVisualizerServer


def test_server_act_hold_decision():
    server = ConnectomeVisualizerServer(use_champion=False)
    dice = [1, 2, 3, 4, 5]
    avail = ["Aces", "Deuces", "Choice", "SmallStraight"]
    
    result = server.act(dice=dice, roll_count=1, available_categories=avail)
    assert "action" in result
    assert result["action"] in ["hold", "score"]
    assert "telemetry" in result
    if result["action"] == "hold":
        assert isinstance(result["holds"], list)
        assert len(result["holds"]) == 5
    else:
        assert result["category"] in avail


def test_server_act_score_decision_at_roll_3():
    server = ConnectomeVisualizerServer(use_champion=False)
    dice = [6, 6, 6, 2, 1]
    avail = ["Sixes", "FourOfAKind", "Choice"]
    
    result = server.act(dice=dice, roll_count=3, available_categories=avail)
    assert result["action"] == "score"
    assert result["category"] in avail
    assert "telemetry" in result
    assert result["telemetry"]["phase"] == "score"
