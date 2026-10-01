import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import numpy as np
import pytest
from forward_sim import FlySubcircuitSNN, load_scaled_subcircuit


def test_scaled_snn_latency_and_regions():
    adj, meta = load_scaled_subcircuit()
    assert meta["total_neurons"] >= 20000
    
    snn = FlySubcircuitSNN(adj, meta)
    assert snn.cx_slice is not None
    assert len(snn.apl_indices) == 2
    
    # Stimulate 10 PNs
    active_pns = list(range(10))
    t0 = time.perf_counter()
    history = snn.run_simulation(num_steps=20, active_pn_indices=active_pns, pulse_steps=3)
    duration_ms = (time.perf_counter() - t0) * 1000.0
    per_step_ms = duration_ms / 20.0
    
    print(f"\nScaled SNN ({meta['total_neurons']} neurons) step latency: {per_step_ms:.3f} ms/step")
    # Verify per-step latency is strictly under 1.0 ms on Apple M4
    assert per_step_ms < 1.0
    assert sum(history["pn_spikes"]) > 0
    assert sum(history["kc_spikes"]) > 0
    assert sum(history["mbon_spikes"]) > 0
