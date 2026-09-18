import sys
from pathlib import Path
SRC_DIR = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from pvp_duel import play_1v1_match, calculate_elo, format_dramatic_match_narrative
from agent import RandomAgent, FlyBrainAgent


def test_calculate_elo():
    r_a, r_b = calculate_elo(1200.0, 1200.0, 1.0)
    assert r_a > 1200.0
    assert r_b < 1200.0
    assert abs((r_a - 1200.0) + (r_b - 1200.0)) < 1e-5


def test_play_1v1_match():
    agent_a = RandomAgent()
    agent_b = RandomAgent()
    res = play_1v1_match(agent_a, agent_b)
    
    assert res["winner"] in ("A", "B", "DRAW")
    assert res["score_a"] > 0
    assert res["score_b"] > 0
    assert len(res["rounds"]) == 12
    
    narrative = format_dramatic_match_narrative(res, "Fly-A", "Fly-B")
    assert "SHOWDOWN" in narrative
    assert "WINNER" in narrative or "DRAW" in narrative
