import sys
from pathlib import Path
import numpy as np
import pytest

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from forward_sim import FlySubcircuitSNN, load_cached_subcircuit
from telemetry_agent import TelemetryFlyBrainAgent, GameSession
from web_server import ConnectomeVisualizerServer


def test_telemetry_agent_recording():
    base_adj, metadata = load_cached_subcircuit()
    snn = FlySubcircuitSNN(base_adj, metadata)
    agent = TelemetryFlyBrainAgent(snn, sim_steps=15, pulse_steps=4)
    
    dice = [3, 3, 5, 5, 2]
    avail = ["Aces", "FullHouse", "Choice"]
    
    # 1. Hold decision with telemetry
    holds, telemetry = agent.decide_hold_with_telemetry(dice, roll_count=1, available_categories=avail)
    assert isinstance(holds, list)
    assert len(holds) == 5
    assert telemetry["phase"] == "hold"
    assert telemetry["sim_steps"] == 15
    assert len(telemetry["spikes_per_step"]) == 15
    assert len(telemetry["mbon_firing_counts"]) == 24
    
    # 2. Category decision with telemetry
    cat, cat_telemetry = agent.decide_category_with_telemetry(dice, roll_count=3, available_categories=avail)
    assert cat in avail
    assert cat_telemetry["phase"] == "category"
    assert len(cat_telemetry["spikes_per_step"]) == 15


def test_game_session_and_server():
    server = ConnectomeVisualizerServer(use_champion=False)
    status = server.get_status()
    
    assert status["total_neurons"] == 1575
    assert status["round"] == 1
    assert status["is_finished"] is False
    assert len(status["current_dice"]) == 5
    
    # Step 1 micro-turn
    record = server.step()
    assert "action" in record
    assert "telemetry" in record
    assert record["total_score"] >= 0
    
    # Reset
    reset_status = server.reset()
    assert reset_status["round"] == 1
    assert reset_status["total_score"] == 0

    # Topology endpoint
    topo = server.get_topology()
    assert topo["total_neurons"] == 1575
    assert "layers" in topo


def test_scaled_server_topology():
    server = ConnectomeVisualizerServer(use_champion=False, use_scaled=True)
    status = server.get_status()
    assert status["total_neurons"] >= 20000
    assert status["is_scaled"] is True

    topo = server.get_topology()
    assert topo["total_neurons"] >= 20000
    assert len(topo["coordinates_3d"]) >= 20000
    assert len(topo["regions"]) >= 20000
    assert topo["is_scaled"] is True
