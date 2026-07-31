import { calculateUpperBonus } from "./score";
import { ScoreCategory, TurnRecord } from "./types";

const UPPER_CATEGORIES: readonly ScoreCategory[] = [
  "Aces",
  "Deuces",
  "Treys",
  "Fours",
  "Fives",
  "Sixes"
];

/**
 * Runtime shape accepted from persisted history. Older matches do not have
 * cumulativeScore because that field was added after the first history format.
 */
export type HistoryTurnRecord = Omit<TurnRecord, "cumulativeScore"> & {
  readonly cumulativeScore?: number;
};

export const isUpperCategory = (category: ScoreCategory): boolean =>
  UPPER_CATEGORIES.includes(category);

/**
 * Normalizes new and legacy history into a chronological, bonus-inclusive form.
 * Stored cumulative values are preserved; missing values are reconstructed from
 * the turn scores and the upper-section bonus rule.
 */
export const normalizeTurnHistory = (
  history: readonly HistoryTurnRecord[]
): readonly TurnRecord[] => {
  const sortedHistory = [...history].sort(
    (a, b) => a.turnNumber - b.turnNumber || a.playerIndex - b.playerIndex
  );
  const playerProgress = new Map<number, { rawScore: number; upperSum: number }>();

  return sortedHistory.map((turn) => {
    const progress = playerProgress.get(turn.playerIndex) ?? { rawScore: 0, upperSum: 0 };
    const nextRawScore = progress.rawScore + turn.score;
    const nextUpperSum = progress.upperSum + (isUpperCategory(turn.category) ? turn.score : 0);
    const derivedCumulativeScore = nextRawScore + calculateUpperBonus(nextUpperSum);

    playerProgress.set(turn.playerIndex, {
      rawScore: nextRawScore,
      upperSum: nextUpperSum
    });

    return {
      ...turn,
      cumulativeScore:
        typeof turn.cumulativeScore === "number"
          ? turn.cumulativeScore
          : derivedCumulativeScore
    };
  });
};

/** Returns the last known cumulative score for each player in normalized history. */
export const calculateHistoryFinalScores = (
  history: readonly HistoryTurnRecord[]
): readonly number[] => {
  const finalScores = new Map<number, number>();
  for (const turn of normalizeTurnHistory(history)) {
    finalScores.set(turn.playerIndex, turn.cumulativeScore);
  }

  const maxPlayerIndex = Math.max(-1, ...finalScores.keys());
  return Array.from({ length: maxPlayerIndex + 1 }, (_, index) => finalScores.get(index) ?? 0);
};
