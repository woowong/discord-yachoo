import { describe, it, expect } from "vitest";
import { calculateExpectedScore, calculateEloChange } from "./elo";

describe("Elo rating calculation", () => {
  describe("calculateExpectedScore", () => {
    it("should return 0.5 for equal ratings", () => {
      expect(calculateExpectedScore(1000, 1000)).toBeCloseTo(0.5);
    });

    it("should return higher expected score for higher rated player", () => {
      const expA = calculateExpectedScore(1200, 800);
      expect(expA).toBeGreaterThan(0.9);
      expect(expA).toBeCloseTo(0.909, 3);
    });
  });

  describe("calculateEloChange", () => {
    it("should update ratings correctly when equal players play", () => {
      const result = calculateEloChange(1000, 1000, 1); // Player A wins
      expect(result.newRatingA).toBe(1016);
      expect(result.newRatingB).toBe(984);
      expect(result.deltaA).toBe(16);
      expect(result.deltaB).toBe(-16);
    });

    it("should result in larger change for an upset victory", () => {
      const result = calculateEloChange(800, 1200, 1); // Underdog wins
      expect(result.deltaA).toBeGreaterThan(16);
      expect(result.deltaB).toBeLessThan(-16);
    });

    it("should result in smaller change when favorite wins", () => {
      const result = calculateEloChange(1200, 800, 1); // Favorite wins
      expect(result.deltaA).toBeLessThan(16);
      expect(result.deltaB).toBeGreaterThan(-16);
    });

    it("should yield no change on draw for equal players", () => {
      const result = calculateEloChange(1000, 1000, 0.5); // Draw
      expect(result.newRatingA).toBe(1000);
      expect(result.newRatingB).toBe(1000);
      expect(result.deltaA).toBe(0);
      expect(result.deltaB).toBe(0);
    });

    it("should enforce the minimum floor of 100", () => {
      const result = calculateEloChange(105, 105, 0); // Player A loses, rating drops from 105 to 89, capped at 100
      expect(result.newRatingA).toBe(100);
      expect(result.deltaA).toBe(-5);
    });
  });
});
