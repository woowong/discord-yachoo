import { describe, it, expect } from "vitest";
import { Either } from "effect";
import {
  calculateOdds,
  validateBet,
  calculatePayout,
  selectRandomGladiators,
  GLADIATOR_PERSONAS
} from "./colosseum";

describe("Colosseum Domain Logic", () => {
  describe("calculateOdds", () => {
    it("should calculate symmetric odds for equal ratings", () => {
      const { oddsA, oddsB } = calculateOdds(1200, 1200);
      expect(oddsA).toBe(oddsB);
      expect(oddsA).toBeGreaterThanOrEqual(1.8);
      expect(oddsA).toBeLessThanOrEqual(2.0);
    });

    it("should give lower odds to favorite and higher odds to underdog", () => {
      const { oddsA, oddsB } = calculateOdds(1400, 1000);
      expect(oddsA).toBeLessThan(oddsB);
      expect(oddsA).toBeLessThan(1.2);
      expect(oddsB).toBeGreaterThan(5.0);
    });
  });

  describe("validateBet", () => {
    it("should reject bet if user Elo is 800 or below", () => {
      const res = validateBet(800, 20);
      expect(Either.isLeft(res)).toBe(true);
      if (Either.isLeft(res)) {
        expect(res.left.message).toContain("파산 방지");
      }
    });

    it("should reject bet under minimum or over maximum", () => {
      const resLow = validateBet(1000, 5);
      expect(Either.isLeft(resLow)).toBe(true);

      const resHigh = validateBet(1000, 100);
      expect(Either.isLeft(resHigh)).toBe(true);
    });

    it("should reject bet if it leaves user below 800 floor", () => {
      const res = validateBet(810, 20);
      expect(Either.isLeft(res)).toBe(true);
      if (Either.isLeft(res)) {
        expect(res.left.message).toContain("보호 한도");
      }
    });

    it("should accept valid bet", () => {
      const res = validateBet(1000, 30);
      expect(Either.isRight(res)).toBe(true);
      if (Either.isRight(res)) {
        expect(res.right).toBe(30);
      }
    });
  });

  describe("calculatePayout", () => {
    it("should calculate WIN payout and net Elo change", () => {
      const { payout, netEloChange } = calculatePayout(20, 2.5, "WIN");
      expect(payout).toBe(50);
      expect(netEloChange).toBe(30);
    });

    it("should calculate LOSS payout and net Elo change", () => {
      const { payout, netEloChange } = calculatePayout(20, 2.5, "LOSS");
      expect(payout).toBe(0);
      expect(netEloChange).toBe(-20);
    });

    it("should calculate DRAW refund", () => {
      const { payout, netEloChange } = calculatePayout(20, 2.5, "DRAW");
      expect(payout).toBe(20);
      expect(netEloChange).toBe(0);
    });
  });

  describe("selectRandomGladiators", () => {
    it("should select two different personas", () => {
      const [p1, p2] = selectRandomGladiators();
      expect(p1.id).not.toBe(p2.id);
      expect(GLADIATOR_PERSONAS[p1.id]).toBeDefined();
      expect(GLADIATOR_PERSONAS[p2.id]).toBeDefined();
    });
  });
});
