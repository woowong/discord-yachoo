import random
from typing import Dict, List, Optional, Set, Tuple

ScoreCategory = str

CATEGORIES: List[ScoreCategory] = [
    "Aces",
    "Deuces",
    "Treys",
    "Fours",
    "Fives",
    "Sixes",
    "Choice",
    "FourOfAKind",
    "FullHouse",
    "SmallStraight",
    "LargeStraight",
    "Yacht"
]

UPPER_CATEGORIES = ["Aces", "Deuces", "Treys", "Fours", "Fives", "Sixes"]


def calculate_score(category: ScoreCategory, dice: List[int]) -> int:
    """Calculate Yacht score for a category given 5 dice."""
    assert len(dice) == 5, f"Expected 5 dice, got {len(dice)}"
    
    # Frequency map
    freqs: Dict[int, int] = {}
    for d in dice:
        freqs[d] = freqs.get(d, 0) + 1
        
    counts = list(freqs.values())
    total_sum = sum(dice)
    unique_vals = set(dice)
    
    if category == "Aces":
        return sum(d for d in dice if d == 1)
    elif category == "Deuces":
        return sum(d for d in dice if d == 2)
    elif category == "Treys":
        return sum(d for d in dice if d == 3)
    elif category == "Fours":
        return sum(d for d in dice if d == 4)
    elif category == "Fives":
        return sum(d for d in dice if d == 5)
    elif category == "Sixes":
        return sum(d for d in dice if d == 6)
    elif category == "Choice":
        return total_sum
    elif category == "FourOfAKind":
        return total_sum if any(c >= 4 for c in counts) else 0
    elif category == "FullHouse":
        has_three_and_two = (3 in counts and 2 in counts)
        has_five = (5 in counts)
        return total_sum if (has_three_and_two or has_five) else 0
    elif category == "SmallStraight":
        s1 = {1, 2, 3, 4}.issubset(unique_vals)
        s2 = {2, 3, 4, 5}.issubset(unique_vals)
        s3 = {3, 4, 5, 6}.issubset(unique_vals)
        return 15 if (s1 or s2 or s3) else 0
    elif category == "LargeStraight":
        l1 = {1, 2, 3, 4, 5}.issubset(unique_vals)
        l2 = {2, 3, 4, 5, 6}.issubset(unique_vals)
        return 30 if (l1 or l2) else 0
    elif category == "Yacht":
        return 50 if len(unique_vals) == 1 else 0
    else:
        raise ValueError(f"Unknown category: {category}")


class YachtEnv:
    """
    Standard single-player Yacht (Yahtzee) game environment.
    12 rounds, each round allows up to 3 rolls (2 rerolls).
    """
    def __init__(self, seed: Optional[int] = None):
        if seed is not None:
            random.seed(seed)
        self.reset()

    def reset(self) -> Tuple[List[int], int, Dict[ScoreCategory, Optional[int]]]:
        self.round_num = 1
        self.score_board: Dict[ScoreCategory, Optional[int]] = {cat: None for cat in CATEGORIES}
        self.current_dice: List[int] = self._roll_all()
        self.roll_count = 1  # First roll already done
        self.is_finished = False
        return self.current_dice, self.roll_count, self.get_available_categories()

    def _roll_all(self) -> List[int]:
        return [random.randint(1, 6) for _ in range(5)]

    def get_available_categories(self) -> List[ScoreCategory]:
        return [cat for cat, score in self.score_board.items() if score is None]

    def roll(self, holds: List[bool]) -> Tuple[List[int], int]:
        """
        Rerolls dice where hold is False.
        holds: list of 5 booleans (True = keep, False = reroll).
        """
        if self.is_finished:
            raise RuntimeError("Game is already finished.")
        if self.roll_count >= 3:
            raise RuntimeError("Maximum roll count (3) reached. Must select a category.")
            
        assert len(holds) == 5, f"Holds must be length 5, got {len(holds)}"
        for i in range(5):
            if not holds[i]:
                self.current_dice[i] = random.randint(1, 6)
                
        self.roll_count += 1
        return self.current_dice, self.roll_count

    def score(self, category: ScoreCategory) -> int:
        """
        Records the score for the selected category and advances to the next turn.
        """
        if self.is_finished:
            raise RuntimeError("Game is already finished.")
        if self.score_board[category] is not None:
            raise ValueError(f"Category '{category}' is already filled!")
            
        scored_points = calculate_score(category, self.current_dice)
        self.score_board[category] = scored_points
        
        # Advance turn
        if len(self.get_available_categories()) == 0:
            self.is_finished = True
        else:
            self.round_num += 1
            self.current_dice = self._roll_all()
            self.roll_count = 1
            
        return scored_points

    @property
    def upper_section_sum(self) -> int:
        return sum(self.score_board[cat] or 0 for cat in UPPER_CATEGORIES)

    @property
    def upper_bonus(self) -> int:
        return 35 if self.upper_section_sum >= 63 else 0

    @property
    def total_score(self) -> int:
        base_sum = sum(score for score in self.score_board.values() if score is not None)
        return base_sum + self.upper_bonus
