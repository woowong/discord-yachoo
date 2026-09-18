import sys
from pathlib import Path
SRC_DIR = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from personas import PERSONA_SPECS, create_persona_agent, simulate_colosseum_duel


def test_persona_specs():
    assert len(PERSONA_SPECS) == 4
    for pid in ["Jackpot", "Newton", "Speeder", "Chimera"]:
        assert pid in PERSONA_SPECS
        spec = PERSONA_SPECS[pid]
        assert "title" in spec
        assert "emoji" in spec
        assert "elo" in spec


def test_create_persona_agent():
    agent = create_persona_agent("Jackpot")
    assert agent.name == "Jackpot"
    assert agent.emoji == "🔥"
    
    # Test hold decision and dopamine dialogue
    holds = agent.decide_hold([5, 5, 5, 2, 1], 1, ["Yacht", "Choice"])
    assert len(holds) == 5
    assert agent.last_dopamine_level > 0
    assert len(agent.last_dialogue) > 0


def test_simulate_colosseum_duel():
    res = simulate_colosseum_duel("Jackpot", "Newton")
    assert res["winner"] in ("A", "B", "DRAW")
    assert res["score_a"] > 0
    assert res["score_b"] > 0
    assert len(res["rounds"]) == 12
    assert "dopamine" in res["rounds"][0]["a"]
    assert "dialogue" in res["rounds"][0]["a"]
    assert "dopamine" in res["rounds"][0]["b"]
    assert "dialogue" in res["rounds"][0]["b"]
