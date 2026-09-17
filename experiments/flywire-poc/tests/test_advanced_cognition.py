import sys
from pathlib import Path
import numpy as np

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from forward_sim import load_cached_subcircuit
from advanced_cognition import AdvancedCognitionSNN, AdvancedCognitiveFlyAgent
from run_game import play_single_game


def test_dynamic_apl_gating():
    base_adj, meta = load_cached_subcircuit()
    snn = AdvancedCognitionSNN(base_adj, meta)
    
    # Check default inhibition
    apl_idx = meta["layers"]["apl_inhibition"]["index"]
    start = snn.W.indptr[apl_idx]
    end = snn.W.indptr[apl_idx + 1]
    
    # Relax APL
    snn.set_apl_inhibition_strength(-0.15)
    assert np.allclose(snn.W.data[start:end], -0.15)
    
    # Tighten APL
    snn.set_apl_inhibition_strength(-0.6)
    assert np.allclose(snn.W.data[start:end], -0.6)


def test_advanced_agent_gameplay():
    base_adj, meta = load_cached_subcircuit()
    snn = AdvancedCognitionSNN(base_adj, meta)
    agent = AdvancedCognitiveFlyAgent(snn=snn)
    
    game_res = play_single_game(agent)
    assert game_res["completed"] is True
    assert game_res["total_score"] > 0
    assert len(game_res["turns"]) == 12
