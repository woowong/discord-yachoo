import { calculateHistoryFinalScores, HistoryTurnRecord } from "../domain/history";

export interface MatchScoreRepairInput {
  readonly mode: "single" | "multi";
  readonly player1Id: string;
  readonly player2Id: string | null;
  readonly surrenderedId: string | null;
  readonly winnerId: string | null;
  readonly history: readonly HistoryTurnRecord[];
}

export interface MatchScoreRepairResult {
  readonly player1Score: number;
  readonly player2Score: number | null;
  readonly winnerId: string | null;
}

/** Reconstructs summary scores from history while preserving surrender outcomes. */
export const reconstructMatchScores = (
  input: MatchScoreRepairInput
): MatchScoreRepairResult => {
  const finalScores = calculateHistoryFinalScores(input.history);
  const player1Score = finalScores[0] ?? 0;
  const player2Score = input.mode === "multi" ? finalScores[1] ?? 0 : null;

  if (input.surrenderedId) {
    return { player1Score, player2Score, winnerId: input.winnerId };
  }

  if (input.mode !== "multi" || !input.player2Id) {
    return { player1Score, player2Score, winnerId: null };
  }

  return {
    player1Score,
    player2Score,
    winnerId:
      player1Score > (player2Score ?? 0)
        ? input.player1Id
        : (player2Score ?? 0) > player1Score
          ? input.player2Id
          : null
  };
};
