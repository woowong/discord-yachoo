import { describe, it, expect } from "vitest";
import {
  calculateUpper,
  calculateChoice,
  calculateFourOfAKind,
  calculateFullHouse,
  calculateSmallStraight,
  calculateLargeStraight,
  calculateYacht,
  calculateUpperBonus,
  calculateScore
} from "./score";

describe("Yacht Dice Score Rules Engine", () => {
  describe("Upper Section", () => {
    it("should sum only the matching dice values", () => {
      expect(calculateUpper([1, 1, 1, 3, 5], 1)).toBe(3);
      expect(calculateUpper([1, 1, 1, 3, 5], 5)).toBe(5);
      expect(calculateUpper([1, 1, 1, 3, 5], 2)).toBe(0);
      expect(calculateUpper([6, 6, 2, 3, 4], 6)).toBe(12);
    });
  });

  describe("Choice", () => {
    it("should sum all dice values", () => {
      expect(calculateChoice([2, 3, 4, 5, 6])).toBe(20);
      expect(calculateChoice([1, 1, 1, 1, 1])).toBe(5);
    });
  });

  describe("Four of a Kind", () => {
    it("should sum all dice if 4 or more are identical", () => {
      expect(calculateFourOfAKind([3, 3, 3, 3, 5])).toBe(17);
      expect(calculateFourOfAKind([5, 5, 5, 5, 5])).toBe(25);
    });

    it("should return 0 if there are fewer than 4 identical dice", () => {
      expect(calculateFourOfAKind([3, 3, 3, 4, 5])).toBe(0);
    });
  });

  describe("Full House", () => {
    it("should sum all dice if there is a 3-of-a-kind and a pair", () => {
      expect(calculateFullHouse([4, 4, 4, 2, 2])).toBe(16);
      expect(calculateFullHouse([2, 2, 6, 6, 6])).toBe(22);
    });

    it("should sum all dice if there is a Yacht (5-of-a-kind) (User Rule)", () => {
      expect(calculateFullHouse([5, 5, 5, 5, 5])).toBe(25);
    });

    it("should return 0 if it is not a full house", () => {
      expect(calculateFullHouse([4, 4, 4, 2, 3])).toBe(0);
      expect(calculateFullHouse([1, 2, 3, 4, 5])).toBe(0);
    });
  });

  describe("Small Straight", () => {
    it("should return 15 for 4 consecutive values", () => {
      expect(calculateSmallStraight([1, 2, 3, 4, 6])).toBe(15);
      expect(calculateSmallStraight([1, 3, 4, 5, 6])).toBe(15);
      expect(calculateSmallStraight([2, 3, 4, 5, 2])).toBe(15);
    });

    it("should return 15 for a Large Straight (User Rule)", () => {
      expect(calculateSmallStraight([1, 2, 3, 4, 5])).toBe(15);
      expect(calculateSmallStraight([2, 3, 4, 5, 6])).toBe(15);
    });

    it("should return 0 for non-straights", () => {
      expect(calculateSmallStraight([1, 2, 3, 5, 6])).toBe(0);
    });
  });

  describe("Large Straight", () => {
    it("should return 30 for 5 consecutive values", () => {
      expect(calculateLargeStraight([1, 2, 3, 4, 5])).toBe(30);
      expect(calculateLargeStraight([2, 3, 4, 5, 6])).toBe(30);
    });

    it("should return 0 for non-large straights", () => {
      expect(calculateLargeStraight([1, 2, 3, 4, 6])).toBe(0);
      expect(calculateLargeStraight([2, 3, 4, 5, 5])).toBe(0);
    });
  });

  describe("Yacht", () => {
    it("should return 50 for 5 identical values", () => {
      expect(calculateYacht([6, 6, 6, 6, 6])).toBe(50);
      expect(calculateYacht([1, 1, 1, 1, 1])).toBe(50);
    });

    it("should return 0 if not all 5 are identical", () => {
      expect(calculateYacht([6, 6, 6, 6, 5])).toBe(0);
    });
  });

  describe("Upper Section Bonus", () => {
    it("should return 35 if sum is >= 63", () => {
      expect(calculateUpperBonus(63)).toBe(35);
      expect(calculateUpperBonus(70)).toBe(35);
    });

    it("should return 0 if sum is < 63", () => {
      expect(calculateUpperBonus(62)).toBe(0);
      expect(calculateUpperBonus(0)).toBe(0);
    });
  });

  describe("calculateScore Router", () => {
    it("should route calculation to correct function", () => {
      const dice = [1, 2, 3, 4, 5] as const;
      expect(calculateScore("Aces", dice)).toBe(1);
      expect(calculateScore("LargeStraight", dice)).toBe(30);
      expect(calculateScore("Choice", dice)).toBe(15);
    });
  });
});
