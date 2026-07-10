import { Dice, DiceRoll, ScoreCategory } from "./types";

/**
 * Counts the occurrences of each dice value in the roll.
 */
const getFrequencies = (dice: DiceRoll): Record<number, number> => {
  const freqs: Record<number, number> = {};
  for (const val of dice) {
    freqs[val] = (freqs[val] || 0) + 1;
  }
  return freqs;
};

/**
 * Calculates score for upper section categories (Aces = 1, Deuces = 2, etc.)
 */
export const calculateUpper = (dice: DiceRoll, target: Dice): number => {
  return dice.filter((d) => d === target).reduce((sum, d) => sum + d, 0);
};

/**
 * Calculates Choice score: sum of all dice.
 */
export const calculateChoice = (dice: DiceRoll): number => {
  return dice.reduce((sum, d) => sum + d, 0);
};

/**
 * Calculates Four of a Kind score: sum of all dice if 4 or more dice are the same.
 */
export const calculateFourOfAKind = (dice: DiceRoll): number => {
  const freqs = getFrequencies(dice);
  const hasFourOfAKind = Object.values(freqs).some((count) => count >= 4);
  return hasFourOfAKind ? dice.reduce((sum, d) => sum + d, 0) : 0;
};

/**
 * Calculates Full House score: sum of all dice if there is 3 of one value and 2 of another,
 * or 5 of the same value (Yacht).
 */
export const calculateFullHouse = (dice: DiceRoll): number => {
  const freqs = getFrequencies(dice);
  const counts = Object.values(freqs);
  
  const hasThreeAndTwo = counts.includes(3) && counts.includes(2);
  const hasFiveOfAKind = counts.includes(5); // Yacht can count as Full House

  if (hasThreeAndTwo || hasFiveOfAKind) {
    return dice.reduce((sum, d) => sum + d, 0);
  }
  return 0;
};

/**
 * Calculates Small Straight score: 15 points if 4 or more consecutive dice exist.
 */
export const calculateSmallStraight = (dice: DiceRoll): number => {
  const uniqueVals = new Set(dice);
  
  // Possible small straight subsets
  const s1 = [1, 2, 3, 4].every(x => uniqueVals.has(x as Dice));
  const s2 = [2, 3, 4, 5].every(x => uniqueVals.has(x as Dice));
  const s3 = [3, 4, 5, 6].every(x => uniqueVals.has(x as Dice));

  return (s1 || s2 || s3) ? 15 : 0;
};

/**
 * Calculates Large Straight score: 30 points if 5 consecutive dice exist.
 */
export const calculateLargeStraight = (dice: DiceRoll): number => {
  const uniqueVals = new Set(dice);

  // Possible large straight subsets
  const l1 = [1, 2, 3, 4, 5].every(x => uniqueVals.has(x as Dice));
  const l2 = [2, 3, 4, 5, 6].every(x => uniqueVals.has(x as Dice));

  return (l1 || l2) ? 30 : 0;
};

/**
 * Calculates Yacht score: 50 points if all 5 dice are the same.
 */
export const calculateYacht = (dice: DiceRoll): number => {
  const first = dice[0];
  const isYacht = dice.every((d) => d === first);
  return isYacht ? 50 : 0;
};

/**
 * Calculates the total score of the upper section to check for bonus eligibility.
 */
export const calculateUpperSectionSum = (scoreBoard: Partial<Record<ScoreCategory, number>>): number => {
  const upperCategories: ScoreCategory[] = ["Aces", "Deuces", "Treys", "Fours", "Fives", "Sixes"];
  return upperCategories.reduce((sum, cat) => sum + (scoreBoard[cat] || 0), 0);
};

/**
 * Calculates upper section bonus score: 35 points if sum of upper section is >= 63.
 */
export const calculateUpperBonus = (upperSum: number): number => {
  return upperSum >= 63 ? 35 : 0;
};

/**
 * Router function to calculate score for a specific category given a dice roll.
 */
export const calculateScore = (category: ScoreCategory, dice: DiceRoll): number => {
  switch (category) {
    case "Aces":
      return calculateUpper(dice, 1);
    case "Deuces":
      return calculateUpper(dice, 2);
    case "Treys":
      return calculateUpper(dice, 3);
    case "Fours":
      return calculateUpper(dice, 4);
    case "Fives":
      return calculateUpper(dice, 5);
    case "Sixes":
      return calculateUpper(dice, 6);
    case "Choice":
      return calculateChoice(dice);
    case "FourOfAKind":
      return calculateFourOfAKind(dice);
    case "FullHouse":
      return calculateFullHouse(dice);
    case "SmallStraight":
      return calculateSmallStraight(dice);
    case "LargeStraight":
      return calculateLargeStraight(dice);
    case "Yacht":
      return calculateYacht(dice);
  }
};
