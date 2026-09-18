import unittest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from yacht_env import YachtEnv, calculate_score, CATEGORIES


class TestYachtEnv(unittest.TestCase):
    def test_upper_scores(self):
        dice = [1, 1, 2, 4, 5]
        self.assertEqual(calculate_score("Aces", dice), 2)
        self.assertEqual(calculate_score("Deuces", dice), 2)
        self.assertEqual(calculate_score("Treys", dice), 0)
        self.assertEqual(calculate_score("Fours", dice), 4)
        self.assertEqual(calculate_score("Fives", dice), 5)
        self.assertEqual(calculate_score("Sixes", dice), 0)

    def test_lower_scores(self):
        # Full House
        self.assertEqual(calculate_score("FullHouse", [3, 3, 3, 5, 5]), 19)
        self.assertEqual(calculate_score("FullHouse", [6, 6, 6, 6, 6]), 30)
        self.assertEqual(calculate_score("FullHouse", [1, 2, 3, 4, 5]), 0)

        # Four of a Kind
        self.assertEqual(calculate_score("FourOfAKind", [4, 4, 4, 4, 1]), 17)
        self.assertEqual(calculate_score("FourOfAKind", [3, 3, 3, 2, 2]), 0)

        # Straights
        self.assertEqual(calculate_score("SmallStraight", [1, 2, 3, 4, 6]), 15)
        self.assertEqual(calculate_score("SmallStraight", [2, 3, 4, 5, 5]), 15)
        self.assertEqual(calculate_score("LargeStraight", [2, 3, 4, 5, 6]), 30)
        self.assertEqual(calculate_score("LargeStraight", [1, 2, 3, 4, 6]), 0)

        # Yacht & Choice
        self.assertEqual(calculate_score("Yacht", [5, 5, 5, 5, 5]), 50)
        self.assertEqual(calculate_score("Yacht", [5, 5, 5, 5, 6]), 0)
        self.assertEqual(calculate_score("Choice", [1, 2, 3, 4, 5]), 15)

    def test_env_game_flow(self):
        env = YachtEnv(seed=42)
        self.assertEqual(len(env.get_available_categories()), 12)
        
        # Roll twice
        env.roll([True, True, False, False, False])
        self.assertEqual(env.roll_count, 2)
        env.roll([True, True, True, True, True])
        self.assertEqual(env.roll_count, 3)

        # Scoring advances round
        scored = env.score("Choice")
        self.assertGreater(scored, 0)
        self.assertEqual(env.round_num, 2)
        self.assertEqual(env.roll_count, 1)
        self.assertNotIn("Choice", env.get_available_categories())


if __name__ == "__main__":
    unittest.main()
