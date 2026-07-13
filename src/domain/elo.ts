/**
 * Calculates the expected score for player A against player B.
 */
export const calculateExpectedScore = (ratingA: number, ratingB: number): number => {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

/**
 * Calculates the Elo rating change for both players.
 * outcomeA: 1 for Player A win, 0 for Player A loss, 0.5 for a draw.
 * Minimum rating is capped at 100.
 */
export const calculateEloChange = (
  ratingA: number,
  ratingB: number,
  outcomeA: 1 | 0.5 | 0,
  K = 32
): {
  readonly newRatingA: number;
  readonly newRatingB: number;
  readonly deltaA: number;
  readonly deltaB: number;
} => {
  const expectedA = calculateExpectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;

  const outcomeB = (1 - outcomeA) as 1 | 0.5 | 0;

  const rawNewA = ratingA + K * (outcomeA - expectedA);
  const rawNewB = ratingB + K * (outcomeB - expectedB);

  const newRatingA = Math.max(100, Math.round(rawNewA));
  const newRatingB = Math.max(100, Math.round(rawNewB));

  const deltaA = newRatingA - ratingA;
  const deltaB = newRatingB - ratingB;

  return {
    newRatingA,
    newRatingB,
    deltaA,
    deltaB
  };
};
