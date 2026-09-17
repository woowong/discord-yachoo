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


if __name__ == "__main__":
    unittest.main()
