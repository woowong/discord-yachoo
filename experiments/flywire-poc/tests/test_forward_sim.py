import unittest
import numpy as np
import scipy.sparse as sp

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from extract import generate_synthetic_mushroom_body
from forward_sim import FlySubcircuitSNN


class TestFlyForwardSim(unittest.TestCase):
    def setUp(self):
        self.adj, self.meta = generate_synthetic_mushroom_body(
            num_kc=200, num_mbon=10, num_input_pn=10, seed=123
        )
        self.snn = FlySubcircuitSNN(self.adj, self.meta)

    def test_forward_propagation(self):
        # Stimulate PN #0 and #1
        history = self.snn.run_simulation(
            num_steps=20, active_pn_indices=[0, 1], pulse_steps=3, pulse_amplitude=2.0
        )
        total_pn = sum(history["pn_spikes"])
        total_kc = sum(history["kc_spikes"])
        total_mbon = sum(history["mbon_spikes"])

        self.assertGreater(total_pn, 0, "Sensory neurons should have spiked")
        self.assertGreater(total_kc, 0, "Kenyon cells should have received excitation")
        self.assertGreater(total_mbon, 0, "MBONs should have received downstream excitation")
        self.assertEqual(len(history["mbon_firing_counts"]), 10)


    def test_dan_neuromodulation_gating(self):
        from forward_sim import compute_dan_modulation
        # 1. Test compute_dan_modulation logic
        gains = compute_dan_modulation(
            available_categories=["Yacht", "Sixes"],
            num_mbon=24,
            pam_boost=1.5,
            ppl1_inhibit=0.0
        )
        # Yacht is cat index 11 -> MBON 5 + 11 = 16
        self.assertEqual(gains[16], 1.5)
        # Aces is not available -> MBON 5 + 0 = 5
        self.assertEqual(gains[5], 0.0)

        # 2. Test SNN forward gating with dan_gains
        # Silence MBON 0 (gain 0.0) and boost MBON 1 (gain 2.0)
        num_mbon = self.meta["layers"]["mbon"]["count"]
        dan_gains = np.ones(num_mbon, dtype=np.float32)
        dan_gains[0] = 0.0  # complete PPL1 satiety silence
        dan_gains[1] = 2.5  # PAM amplification

        self.snn.set_dan_modulation(dan_gains)
        history = self.snn.run_simulation(num_steps=25, active_pn_indices=[0, 1, 2], pulse_amplitude=3.0)
        
        # MBON 0 must have 0 spikes because incoming synaptic current is zeroed
        self.assertEqual(history["mbon_firing_counts"][0], 0, "Silenced MBON should have 0 spikes")


if __name__ == "__main__":
    unittest.main()

