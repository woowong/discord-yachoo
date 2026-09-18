import { Either } from "effect";

export type PersonaId = "Jackpot" | "Newton" | "Speeder" | "Chimera";

export interface GladiatorPersona {
  readonly id: PersonaId;
  readonly name: string;
  readonly title: string;
  readonly emoji: string;
  readonly elo: number;
  readonly style: string;
}

export const GLADIATOR_PERSONAS: Record<PersonaId, GladiatorPersona> = {
  Jackpot: {
    id: "Jackpot",
    name: "Jackpot",
    title: "폭주 초파리 잭팟",
    emoji: "🔥",
    elo: 1250,
    style: "올인 도파민 중독형"
  },
  Newton: {
    id: "Newton",
    name: "Newton",
    title: "상식 초파리 뉴턴",
    emoji: "🧠",
    elo: 1200,
    style: "냉철한 상단 보너스 계산형"
  },
  Speeder: {
    id: "Speeder",
    name: "Speeder",
    title: "질주 초파리 스피더",
    emoji: "⚡",
    elo: 1220,
    style: "직진 스트레이트 포식자"
  },
  Chimera: {
    id: "Chimera",
    name: "Chimera",
    title: "혼돈의 돌연변이 키메라",
    emoji: "🌀",
    elo: 1280,
    style: "시냅스 노이즈 변칙 플레이"
  }
};

export const ALL_PERSONA_IDS: readonly PersonaId[] = ["Jackpot", "Newton", "Speeder", "Chimera"];

export class BetValidationError {
  readonly _tag = "BetValidationError";
  constructor(readonly message: string) {}
}

export const MIN_BET_AMOUNT = 10;
export const MAX_BET_AMOUNT = 50;
export const MIN_USER_ELO_FLOOR = 800;

export const calculateOdds = (
  eloA: number,
  eloB: number,
  margin: number = 0.95
): { readonly oddsA: number; readonly oddsB: number } => {
  const expectedA = 1.0 / (1.0 + Math.pow(10, (eloB - eloA) / 400.0));
  const expectedB = 1.0 - expectedA;

  const rawOddsA = (1.0 / expectedA) * margin;
  const rawOddsB = (1.0 / expectedB) * margin;

  const oddsA = Math.round(Math.max(1.05, Math.min(10.0, rawOddsA)) * 100) / 100;
  const oddsB = Math.round(Math.max(1.05, Math.min(10.0, rawOddsB)) * 100) / 100;

  return { oddsA, oddsB };
};

export const validateBet = (
  userElo: number,
  amount: number
): Either.Either<number, BetValidationError> => {
  if (userElo <= MIN_USER_ELO_FLOOR) {
    return Either.left(
      new BetValidationError(`보유 ELO가 ${MIN_USER_ELO_FLOOR}점 이하인 경우 파산 방지 보호 룰로 인해 베팅할 수 없습니다. (현재: ${userElo} ELO)`)
    );
  }

  if (amount < MIN_BET_AMOUNT || amount > MAX_BET_AMOUNT) {
    return Either.left(
      new BetValidationError(`베팅 금액은 최소 ${MIN_BET_AMOUNT} ELO에서 최대 ${MAX_BET_AMOUNT} ELO까지 가능합니다.`)
    );
  }

  if (amount > userElo - MIN_USER_ELO_FLOOR) {
    const maxAvailable = userElo - MIN_USER_ELO_FLOOR;
    return Either.left(
      new BetValidationError(`보호 한도(${MIN_USER_ELO_FLOOR} ELO)를 초과하여 베팅할 수 없습니다. 최대 베팅 가능: ${maxAvailable} ELO`)
    );
  }

  return Either.right(amount);
};

export const calculatePayout = (
  betAmount: number,
  odds: number,
  outcome: "WIN" | "LOSS" | "DRAW"
): { readonly payout: number; readonly netEloChange: number } => {
  if (outcome === "WIN") {
    const payout = Math.floor(betAmount * odds);
    return {
      payout,
      netEloChange: payout - betAmount
    };
  } else if (outcome === "LOSS") {
    return {
      payout: 0,
      netEloChange: -betAmount
    };
  } else {
    // DRAW -> Refund
    return {
      payout: betAmount,
      netEloChange: 0
    };
  }
};

export const selectRandomGladiators = (
  randomFn: () => number = Math.random
): [GladiatorPersona, GladiatorPersona] => {
  const ids = [...ALL_PERSONA_IDS];
  const idxA = Math.floor(randomFn() * ids.length);
  const idA = ids.splice(idxA, 1)[0];
  const idxB = Math.floor(randomFn() * ids.length);
  const idB = ids[idxB];
  return [GLADIATOR_PERSONAS[idA], GLADIATOR_PERSONAS[idB]];
};
