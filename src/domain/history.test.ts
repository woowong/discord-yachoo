import { describe, expect, it } from "vitest";
import { calculateHistoryFinalScores, normalizeTurnHistory } from "./history";
import { HistoryTurnRecord } from "./history";

const turn = (
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

describe("Match history cumulative score normalization", () => {
  it("derives a legacy history cumulative score and applies the upper bonus at the threshold turn", () => {
    const history = [
      turn(0, 1, "Sixes", 30),
      turn(0, 2, "Fives", 25),
      turn(0, 3, "Fours", 20),
      turn(0, 4, "Choice", 10)
    ];

    expect(normalizeTurnHistory(history).map((record) => record.cumulativeScore)).toEqual([
      30,
      55,
      110,
      120
    ]);
  });

  it("preserves stored cumulative scores while normalizing legacy records around them", () => {
    const history = [
      turn(0, 1, "Sixes", 30, 30),
      turn(0, 2, "Fives", 25, 55),
      turn(0, 3, "Fours", 20, 110),
      turn(0, 4, "Choice", 10)
    ];

    expect(normalizeTurnHistory(history).map((record) => record.cumulativeScore)).toEqual([
      30,
      55,
      110,
      120
    ]);
  });

  it("returns the final score for each player using chronological history", () => {
    const history = [
      turn(0, 1, "Sixes", 30),
      turn(1, 1, "Choice", 15),
      turn(0, 2, "Fives", 25),
      turn(1, 2, "Choice", 20)
    ];

    expect(calculateHistoryFinalScores(history)).toEqual([55, 35]);
  });
});
