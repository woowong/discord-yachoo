import { GameState, ScoreCategory, TurnRecord } from "../../domain/types";

const YACHT_CELEBRATION_POOL = [
  (user: string, dice: string) => `<@${user}> 이걸 진짜 띄운다고... [ ${dice} ] 야추 확정.\n오늘 하루치 운 여기다 다 태웠다고 보면 됨. 저장각.`,
  (user: string, dice: string) => `속보) <@${user}> 확률 뚫음.\n[ ${dice} ]\n이 판 원탑 인정. 이견 있으면 본인도 야추 띄우고 오든가.`,
  (user: string, dice: string) => `이거 혼모노 아니냐...\n<@${user}> [ ${dice} ] 야추 완성.\n다른 사람들 지금 뭐하냐, 구경만 할 거야?`,
  (user: string, dice: string) => `야추 갓 등판.\n<@${user}> [ ${dice} ]\n이쯤되면 실력임. 박제하고 갑니다.`
];

const YACHT_FAILED_TEASE_POOL = [
  (user: string, dice: string) => `<@${user}>님?\n[ ${dice} ] 이거 야추인데 칸 이미 죽어있음.\n뇌절도 이런 뇌절이 없다. 저장각.`,
  (user: string, dice: string) => `속보) <@${user}> 50점 그냥 버림.\n칸 없어서 다른 데 박아야 되는 상황.\n위로할 말이 없다, 그냥 없다.`,
  (user: string, dice: string) => `레전드긴 한데 안 좋은 쪽 레전드.\n<@${user}> [ ${dice} ] 야추 칸 이미 소진.\n이번 판은 그냥 손절라고 보면 됨.`,
  (user: string, dice: string) => `<@${user}> 이거 보고 다들 잠깐 숨죽였는데\n칸 없어서 조용히 다른 데 박음.\n박제함. 다음에 또 이러면 그건 실력임.`
];

const LOW_SCORE_TEASE_POOL = [
  (user: string, category: string, score: number) => `속보) <@${user}> 점수 꼬라지 실화? [ ${category} ]에 [ ${score}점 ] 적고 턴 넘김. 이건 손절각.`,
  (user: string, category: string, score: number) => `<@${user}>님? 주사위 그렇게 굴리고 겨우 [ ${score}점 ] 얻으려고 뇌절한 거 맞죠.`,
  (user: string, category: string, score: number) => `이거 혼모노 아니냐...\n<@${user}> [ ${category} ]에 [ ${score}점 ] 기록함. 저장각.`
];

const STREAK_ZEROS_TEASE_POOL = [
  (user: string) => `속보) <@${user}> 연속 0점 뇌절 중.\n오늘 주사위 다 갖다 버렸나 봄.`,
  (user: string) => `<@${user}>님? 연속 0점은 실력임. 이 판 그냥 손절 추천.`,
  (user: string, count: number) => `레게노 갱신.\n<@${user}> 연속 [ ${count} ]턴 0점 행진 중.\n구경꾼들 다 숨죽임.`
];

const LAST_PLACE_TEASE_POOL = [
  (user: string) => `<@${user}>님? 최종 스코어 실화? 꼴찌 저장각.`,
  (user: string) => `속보) <@${user}> 처참한 꼴찌 확정.\n오늘 야추는 그냥 접는 거 추천.`,
  (user: string) => `이건 쉴드 불가능.\n<@${user}> 꼴찌 레게노 갱신.\n다음 판에 또 이러면 그건 실력임.`
];

const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const KoreanMessages = {
  errors: {
    selfChallenge: "❌ 자기 자신에게는 도전할 수 없습니다! 싱글 모드로 플레이하거나 다른 대상을 지정해 주세요.",
    duplicateChallenge: (url?: string) => 
      `❌ 이미 상대와 진행 중인 대전이 있습니다.` + (url ? `\n[👉 진행 중인 게임으로 이동하기](${url})` : `\n진행 중인 게임 보드를 확인해 주세요.`),
    notYourTurn: (currentPlayerId: string) => `❌ It's not your turn! Current turn: <@${currentPlayerId}>`,
    notPlayerInGame: "❌ You are not a player in this game!",
    allDiceHeld: "모든 주사위가 홀드된 상태에서는 굴릴 수 없습니다. 주사위 홀드를 일부 해제하거나 점수를 기록해 주세요.",
    gameNotFound: (gameId: string) => `Game not found: ${gameId}`
  },
  surrender: {
    confirmText: "⚠️ **정말 항복을 제안하시겠습니까?**\n상대방이 수락하면 게임이 즉시 종료되고 패배 처리됩니다.",
    confirmButtonLabel: "항복 제안 전송",
    completed: "✅ 기권 처리가 완료되었습니다.",
    alreadyFinished: "✅ 이미 종료된 게임입니다.",
    offerAnnounce: (proposerId: string, opponentId: string) => `🏳️ <@${proposerId}> 님이 항복을 제안했습니다! <@${opponentId}> 님, 수락하시겠습니까?`,
    acceptButtonLabel: "🤝 항복 수락",
    declineButtonLabel: "❌ 항복 거절",
    onlyOpponentCanRespond: "❌ 상대방만 항복을 수락하거나 거절할 수 있습니다.",
    declinedAnnounce: (declinerId: string) => `❌ <@${declinerId}> 님이 항복 제안을 거절하였습니다. 경기를 계속 진행합니다.`
  },
  gameEnd: {
    singleFinished: (playerId: string, score: number) => `🏁 게임 완료! <@${playerId}> 님의 최종 스코어: **${score}**점\n\n🎬 **웹 대시보드 복기**: [웹 대시보드 바로가기](https://discord-yachoo.woowong.workers.dev/web?player=${playerId})`,
    singleSurrendered: (playerId: string, score: number) => `🏳️ 항복! <@${playerId}> 님이 게임을 기권하였습니다. 최종 스코어: **${score}**점\n\n🎬 **웹 대시보드 복기**: [웹 대시보드 바로가기](https://discord-yachoo.woowong.workers.dev/web?player=${playerId})`,
    multiSurrendered: (winnerId: string, loserId: string, eloA: number, eloB: number, deltaA: string, deltaB: string) =>
      `🏳️ <@${loserId}> 님이 항복하여 <@${winnerId}> 님이 승리했습니다!\n` +
      `• <@12345>: Elo **${eloA}** (${deltaA})\n` + 
      `• <@67890>: Elo **${eloB}** (${deltaB})`, 
    multiFinished: (winnerId: string, loserId: string, scoreWin: number, scoreLoss: number, eloA: number, eloB: number, deltaA: string, deltaB: string) =>
      `🎉🏆 <@${winnerId}> 님이 승리했습니다! **${scoreWin}**점 대 **${scoreLoss}**점! GG! 🎲\n` +
      `• <@12345>: Elo **${eloA}** (${deltaA})\n` +
      `• <@67890>: Elo **${eloB}** (${deltaB})`,
    multiDraw: (p1Id: string, p2Id: string, score: number, eloA: number, eloB: number, deltaA: string, deltaB: string) =>
      `🤝 무승부! <@${p1Id}> vs <@${p2Id}> - **${score}**점으로 동점!\n` +
      `• <@${p1Id}>: Elo **${eloA}** (${deltaA})\n` +
      `• <@${p2Id}>: Elo **${eloB}** (${deltaB})`
  }
};

export const getMultiSurrenderMessage = (p1Id: string, p2Id: string, surrenderedId: string, eloA: number, eloB: number, deltaA: string, deltaB: string) => {
  const surrenderedPlayerId = surrenderedId;
  const winningPlayerId = p1Id === surrenderedPlayerId ? p2Id : p1Id;
  return `🏳️ <@${surrenderedPlayerId}> 님이 항복하여 <@${winningPlayerId}> 님이 승리했습니다!\n• <@${p1Id}>: Elo **${eloA}** (${deltaA})\n• <@${p2Id}>: Elo **${eloB}** (${deltaB})\n\n🎬 **웹 대시보드 복기**: [웹 대시보드 바로가기](https://discord-yachoo.woowong.workers.dev/web?player=${winningPlayerId})`;
};

export const getMultiFinishedMessage = (p1Id: string, p2Id: string, p1Score: number, p2Score: number, eloA: number, eloB: number, deltaA: string, deltaB: string) => {
  const winnerId = p1Score > p2Score ? p1Id : p2Id;
  if (p1Score > p2Score) {
    return `🎉🏆 <@${p1Id}> 님이 승리했습니다! **${p1Score}**점 대 **${p2Score}**점! GG! 🎲\n• <@${p1Id}>: Elo **${eloA}** (${deltaA})\n• <@${p2Id}>: Elo **${eloB}** (${deltaB})\n\n🎬 **웹 대시보드 복기**: [웹 대시보드 바로가기](https://discord-yachoo.woowong.workers.dev/web?player=${winnerId})`;
  } else {
    return `🎉🏆 <@${p2Id}> 님이 승리했습니다! **${p2Score}**점 대 **${p1Score}**점! GG! 🎲\n• <@${p1Id}>: Elo **${eloA}** (${deltaA})\n• <@${p2Id}>: Elo **${eloB}** (${deltaB})\n\n🎬 **웹 대시보드 복기**: [웹 대시보드 바로가기](https://discord-yachoo.woowong.workers.dev/web?player=${winnerId})`;
  }
};

export const getMultiDrawMessage = (p1Id: string, p2Id: string, score: number, eloA: number, eloB: number, deltaA: string, deltaB: string) => {
  return `🤝 무승부! <@${p1Id}> vs <@${p2Id}> - **${score}**점으로 동점!\n• <@${p1Id}>: Elo **${eloA}** (${deltaA})\n• <@${p2Id}>: Elo **${eloB}** (${deltaB})\n\n🎬 **웹 대시보드 복기**: [웹 대시보드 바로가기](https://discord-yachoo.woowong.workers.dev/web?player=${p1Id})`;
};

export const determineTeasingNotification = (
  gameStateBefore: GameState,
  gameStateAfter: GameState
): string => {
  const lastTurn = gameStateAfter.turnHistory[gameStateAfter.turnHistory.length - 1];
  if (!lastTurn) return "";

  const activePlayer = gameStateAfter.players[lastTurn.playerIndex];
  const activePlayerId = activePlayer ? activePlayer.playerId : lastTurn.playerName;

  // 1. Yacht 달성 축하
  if (lastTurn.category === "Yacht" && lastTurn.score === 50) {
    const lastDice = lastTurn.rolls[lastTurn.rolls.length - 1];
    const diceStr = lastDice ? lastDice.join(", ") : "";
    const msgFunc = getRandomElement(YACHT_CELEBRATION_POOL);
    return msgFunc(activePlayerId, diceStr);
  }

  // 2. 야추 헛박제 놀림
  const prevDice = gameStateBefore.currentDice;
  const activePlayerIndex = gameStateBefore.currentPlayerIndex;
  const hasPrevYachtFilled = gameStateBefore.players[activePlayerIndex].scoreBoard.Yacht !== undefined;
  
  const isYachtDice = (dice: readonly number[]) => dice.length === 5 && dice.every(d => d === dice[0]);

  if (isYachtDice(prevDice) && hasPrevYachtFilled && lastTurn.category !== "Yacht") {
    const msgFunc = getRandomElement(YACHT_FAILED_TEASE_POOL);
    return msgFunc(activePlayerId, prevDice.join(", "));
  }

  // 3. 낮은 점수 확정 놀림
  const isLowScore = 
    (lastTurn.category === "Aces" && lastTurn.score <= 1) ||
    (lastTurn.category === "Choice" && lastTurn.score < 5);
  if (isLowScore) {
    const msgFunc = getRandomElement(LOW_SCORE_TEASE_POOL);
    return msgFunc(activePlayerId, lastTurn.category, lastTurn.score);
  }

  // 4. 연속 0점 기록 놀림
  if (lastTurn.score === 0) {
    const pTurns = gameStateAfter.turnHistory.filter(t => t.playerIndex === lastTurn.playerIndex);
    let zeroStreak = 0;
    for (let i = pTurns.length - 1; i >= 0; i--) {
      if (pTurns[i].score === 0) {
        zeroStreak++;
      } else {
        break;
      }
    }
    if (zeroStreak >= 2) {
      const msgFunc = getRandomElement(STREAK_ZEROS_TEASE_POOL);
      return (msgFunc as any)(activePlayerId, zeroStreak);
    }
  }

  // 5. 최종 꼴찌 놀림
  if (gameStateAfter.status === "Finished" && gameStateAfter.mode === "multi" && !gameStateAfter.surrenderedPlayerId) {
    const p1 = gameStateAfter.players[0];
    const p2 = gameStateAfter.players[1];
    if (p1.totalScore !== p2.totalScore) {
      const loser = p1.totalScore < p2.totalScore ? p1 : p2;
      const msgFunc = getRandomElement(LAST_PLACE_TEASE_POOL);
      return msgFunc(loser.playerId);
    }
  }

  return "";
};
