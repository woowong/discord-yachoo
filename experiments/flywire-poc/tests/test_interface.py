import unittest
import numpy as np
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from encoder import encode_state_to_pn
from decoder import decode_hold_mask, decode_category_selection
from yacht_env import CATEGORIES


class TestInterface(unittest.TestCase):
    def test_encoder(self):
        currents = encode_state_to_pn(
            dice=[1, 2, 3, 4, 5],
            roll_count=2,
            available_categories=["Aces", "Yacht"],
            num_pn=50
        )
        self.assertEqual(len(currents), 50)
        # Check dice slots
        self.assertGreater(currents[0], 0)  # Slot 0 Val 1
        self.assertGreater(currents[7], 0)  # Slot 1 Val 2
        # Check roll count 2
        self.assertGreater(currents[31], 0)
        # Check Aces and Yacht active
        self.assertGreater(currents[33], 0)  # Aces
        self.assertGreater(currents[44], 0)  # Yacht
        self.assertEqual(currents[34], 0)   # Deuces (unavailable)

    def test_decoder_hold(self):
        mbon_spikes = np.zeros(24)
        mbon_spikes[0] = 5
        mbon_spikes[1] = 5
        mbon_spikes[2] = 0
        mbon_spikes[3] = 0
        mbon_spikes[4] = 0
        
        holds = decode_hold_mask(mbon_spikes)
        self.assertEqual(len(holds), 5)
        self.assertTrue(holds[0])
        self.assertTrue(holds[1])
        self.assertFalse(holds[2])

    def test_decoder_hold_satiety_two_pairs(self):
        mbon_spikes = np.zeros(24)  # MBON 0 (Multiples drive)
        dice = [3, 3, 5, 5, 1]

        # Case 1: FullHouse is available -> hold both pairs
        holds_avail = decode_hold_mask(mbon_spikes, dice=dice, available_categories=["FullHouse", "Aces"])
        self.assertEqual(holds_avail, [True, True, True, True, False])

        # Case 2: FullHouse is already used (satiated) -> hold only higher pair (5s)
        holds_satiated = decode_hold_mask(mbon_spikes, dice=dice, available_categories=["Fives", "Threes", "Aces"])
        self.assertEqual(holds_satiated, [False, False, True, True, False])


    def test_decoder_category_strict_masking(self):
        # Suppose MBON for Aces (index 5) has massive firing (100 spikes),
        # but Aces is ALREADY USED.
        mbon_spikes = np.zeros(24)
        mbon_spikes[5] = 100  # Aces
        mbon_spikes[6] = 5    # Deuces
        mbon_spikes[16] = 10  # Yacht
        
        # Only Deuces and Yacht are available
        available = ["Deuces", "Yacht"]
        selected = decode_category_selection(mbon_spikes, available)
        
        # Even though Aces had 100 spikes, Yacht (10) > Deuces (5), and Aces is masked!
        self.assertEqual(selected, "Yacht")
        self.assertIn(selected, available)


if __name__ == "__main__":
    unittest.main()
