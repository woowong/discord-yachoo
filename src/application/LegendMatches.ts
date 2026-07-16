import { MatchRecord } from "../persistence/repository";
import { TurnRecord } from "../domain/types";

export interface LegendMatchTag {
  readonly type: "comeback" | "streak" | "yacht" | "fail";
  readonly label: string;
  readonly description: string;
}

export interface LegendMatchResult {
  readonly match: MatchRecord;
  readonly tags: readonly LegendMatchTag[];
}

export const scanLegendMatch = (match: MatchRecord): readonly LegendMatchTag[] => {
  const tags: LegendMatchTag[] = [];
  if (!match.historyJson) return tags;

  try {
    const turns: readonly TurnRecord[] = JSON.parse(match.historyJson);
    
    // 1. Yacht completed check (야추 달성)
    const hasYacht = turns.some(t => t.category === "Yacht" && t.score === 50);
    if (hasYacht) {
      tags.push({
        type: "yacht",
        label: "🎲 야추 달성",
        description: "야추(Yacht, 50점)를 성공시킨 전설적인 경기"
      });
    }

    // 2. Epic Fail check (연속 0점 뇌절)
    // Find if any player got 0 points in 3 or more consecutive turns
    const player0 = turns.filter(t => t.playerIndex === 0);
    const player1 = turns.filter(t => t.playerIndex === 1);
    
    const hasEpicFail = (pTurns: typeof player0) => {
      let zeroStreak = 0;
      for (const t of pTurns) {
        if (t.score === 0) {
          zeroStreak++;
          if (zeroStreak >= 3) return true;
        } else {
          zeroStreak = 0;
        }
      }
      return false;
    };

    if (hasEpicFail(player0) || (match.mode === "multi" && hasEpicFail(player1))) {
      tags.push({
        type: "fail",
        label: "🧠 연속 뇌절",
        description: "한 플레이어가 3턴 연속 0점을 기록한 역대급 뇌절 경기"
      });
    }

    // 3. Hot Streak check (연속 고득점)
    // Find if any player scored >= 15 points in 5 consecutive turns
    const hasHotStreak = (pTurns: typeof player0) => {
      let streak = 0;
      for (const t of pTurns) {
        if (t.score >= 15) {
          streak++;
          if (streak >= 5) return true;
        } else {
          streak = 0;
        }
      }
      return false;
    };

    if (hasHotStreak(player0) || (match.mode === "multi" && hasHotStreak(player1))) {
      tags.push({
        type: "streak",
        label: "🔥 연속 고득점",
        description: "5턴 연속 15점 이상을 기록하며 폭발적인 주사위 운을 보여준 경기"
      });
    }

    // 4. Comeback Win check (막판 역전)
    if (match.mode === "multi" && match.player2Id && match.winnerId) {
      // Reconstruct scores at each round
      const scoreAtRound = Array.from({ length: 13 }, () => [0, 0]); // round 0 to 12
      const cumulative = [0, 0];
      
      // Sort turns chronologically
      const sortedTurns = [...turns].sort((a, b) => a.turnNumber - b.turnNumber || a.playerIndex - b.playerIndex);
      
      for (const t of sortedTurns) {
        if (t.turnNumber >= 1 && t.turnNumber <= 12) {
          cumulative[t.playerIndex] += t.score;
          scoreAtRound[t.turnNumber][t.playerIndex] = cumulative[t.playerIndex];
        }
      }

      // Propagate previous round scores if a player hasn't played in a specific round yet
      for (let r = 1; r <= 12; r++) {
        if (scoreAtRound[r][0] === 0 && r > 1) scoreAtRound[r][0] = scoreAtRound[r - 1][0];
        if (scoreAtRound[r][1] === 0 && r > 1) scoreAtRound[r][1] = scoreAtRound[r - 1][1];
      }

      // Check if at round 10 or 11, the winner was trailing by >= 25 points
      const winnerIndex = match.winnerId === match.player1Id ? 0 : 1;
      
      const checkComeback = (round: number) => {
        const winnerScore = scoreAtRound[round][winnerIndex];
        const loserScore = scoreAtRound[round][1 - winnerIndex];
        return (loserScore - winnerScore) >= 25;
      };

      if (checkComeback(10) || checkComeback(11)) {
        tags.push({
          type: "comeback",
          label: "⚡ 극적인 역전승",
          description: "10라운드 이후 25점 이상 뒤처지다 마지막에 역전한 경기"
        });
      }
    }
  } catch (e) {
    // Safe fallback
  }

  return tags;
};
