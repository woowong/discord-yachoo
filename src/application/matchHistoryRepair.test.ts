import { describe, expect, it } from "vitest";
import { HistoryTurnRecord } from "../domain/history";
import { reconstructMatchScores } from "./matchHistoryRepair";

const record = (
  playerIndex: number,
  turnNumber: number,
  category: HistoryTurnRecord["category"],
  score: number,
  cumulativeScore?: number
): HistoryTurnRecord => ({
  playerIndex,
  playerName: playerIndex === 0 ? "Alice" : "Bob",
  turnNumber,
  rolls: [[1, 1, 1, 1, 1]],
  category,
  score,
  ...(cumulativeScore === undefined ? {} : { cumulativeScore })
});

describe("match history score repair", () => {
  it("reconstructs normal multiplayer scores and winner", () => {
    expect(reconstructMatchScores({
      mode: "multi",
      player1Id: "p1",
      player2Id: "p2",
      surrenderedId: null,
      winnerId: null,
      history: [record(0, 1, "Choice", 20), record(1, 1, "Choice", 15)]
    })).toEqual({ player1Score: 20, player2Score: 15, winnerId: "p1" });
  });

  it("keeps a valid upper bonus instead of repairing to the raw sum", () => {
    expect(reconstructMatchScores({
      mode: "multi",
      player1Id: "p1",
      player2Id: "p2",
      surrenderedId: null,
      winnerId: null,
      history: [
        record(0, 1, "Sixes", 30),
        record(1, 1, "Choice", 15),
        record(0, 2, "Fives", 25),
        record(1, 2, "Choice", 20),
        record(0, 3, "Fours", 20)
      ]
    })).toEqual({ player1Score: 110, player2Score: 35, winnerId: "p1" });
  });

  it("uses stored cumulative scores when repairing new history", () => {
    expect(reconstructMatchScores({
      mode: "single",
      player1Id: "p1",
      player2Id: null,
      surrenderedId: null,
      winnerId: null,
      history: [record(0, 1, "Choice", 20, 20), record(0, 2, "Choice", 10, 30)]
    })).toEqual({ player1Score: 30, player2Score: null, winnerId: null });
  });

  it("returns a draw when reconstructed multiplayer scores are equal", () => {
    expect(reconstructMatchScores({
      mode: "multi",
      player1Id: "p1",
      player2Id: "p2",
      surrenderedId: null,
      winnerId: null,
      history: [record(0, 1, "Choice", 20), record(1, 1, "Choice", 20)]
    })).toEqual({ player1Score: 20, player2Score: 20, winnerId: null });
  });

  it("preserves the existing winner for surrendered matches", () => {
    expect(reconstructMatchScores({
      mode: "multi",
      player1Id: "p1",
      player2Id: "p2",
      surrenderedId: "p1",
      winnerId: "p2",
      history: [record(0, 1, "Choice", 20)]
    })).toEqual({ player1Score: 20, player2Score: 0, winnerId: "p2" });
  });
});
