import { describe, expect, it } from "vitest";
import { DASHBOARD_HTML } from "./dashboardHtml";

describe("web replay cumulative score rendering", () => {
  it("contains legacy normalization and bonus-inclusive chart/table paths", () => {
    expect(DASHBOARD_HTML).toContain("function normalizeReplayTurns(rawTurns)");
    expect(DASHBOARD_HTML).toContain("typeof turn.cumulativeScore === 'number'");
    expect(DASHBOARD_HTML).toContain("p1Scores[r] = t.cumulativeScore");
    expect(DASHBOARD_HTML).toContain("p2Scores[r] = t.cumulativeScore");
    expect(DASHBOARD_HTML).not.toContain("playerScores[t.playerIndex] += t.score");
  });
});
