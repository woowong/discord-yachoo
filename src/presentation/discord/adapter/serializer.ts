import { Context, Layer } from "effect";
import { GameState, ScoreCategory, TurnRecord } from "../../../domain/types";
import { HistoryTurnRecord, normalizeTurnHistory } from "../../../domain/history";
import { PlayerStats, MatchRecord, ColosseumMatchRecord, ColosseumBetRecord } from "../../../persistence/repository";
import { calculateScore, calculateUpperSectionSum } from "../../../domain/score";
import { GLADIATOR_PERSONAS, PersonaId } from "../../../domain/colosseum";
import { DiscordInteractionResponse, DiscordEmbed, DiscordActionRow } from "./types";

export interface DiscordResponseSerializer {
  readonly serializeGame: (state: GameState, holds?: string, flyBrainUrl?: string) => DiscordInteractionResponse;
  readonly serializeRolling: (state: GameState, holds?: string, flyBrainUrl?: string) => DiscordInteractionResponse;
  readonly serializeLeaderboard: (topPlayers: readonly PlayerStats[], mode: "single" | "multi") => DiscordInteractionResponse;
  readonly serializeError: (message: string) => DiscordInteractionResponse;
  readonly serializeMessage: (content: string) => DiscordInteractionResponse;
  readonly serializeHistoryList: (recentMatches: readonly MatchRecord[], userId: string) => DiscordInteractionResponse;
  readonly serializeHistoryDetails: (match: MatchRecord, page: number) => DiscordInteractionResponse;
  readonly serializeInvitation: (invitation: import("../../../domain/invitation").Invitation) => DiscordInteractionResponse;
  readonly serializeInvitationDeclined: (invitation: import("../../../domain/invitation").Invitation) => DiscordInteractionResponse;
  readonly serializeMatchQueue: (queue: import("../../../domain/matchQueue").MatchQueue) => DiscordInteractionResponse;
  readonly serializeMatchQueueCancelled: (queue: import("../../../domain/matchQueue").MatchQueue) => DiscordInteractionResponse;
  readonly serializeColosseumMatch: (match: ColosseumMatchRecord, bets: readonly ColosseumBetRecord[], flyBrainUrl?: string) => DiscordInteractionResponse;
  readonly serializeColosseumRolling: (match: ColosseumMatchRecord, bets: readonly ColosseumBetRecord[], duelData: any, act: number, flyBrainUrl?: string) => DiscordInteractionResponse;
  readonly serializeColosseumClash: (match: ColosseumMatchRecord, bets: readonly ColosseumBetRecord[], duelData: any, act: number, flyBrainUrl?: string) => DiscordInteractionResponse;
  readonly serializeColosseumResult: (match: ColosseumMatchRecord, bets: readonly ColosseumBetRecord[], duelData: any, flyBrainUrl?: string) => DiscordInteractionResponse;
}

export const DiscordResponseSerializer = Context.GenericTag<DiscordResponseSerializer>("@services/DiscordResponseSerializer");

const DICE_EMOJIS = ["", ":one:", ":two:", ":three:", ":four:", ":five:", ":six:"] as const;
const DICE_BUTTON_EMOJIS = ["", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"] as const;

const DICE_ROLL_GIPHY_POOL = [
  "https://media.giphy.com/media/VGoZVlR9naOZCiRLSy/giphy.gif",
  "https://media.giphy.com/media/3ohjUMQWKmu9GbjP4A/giphy.gif",
  "https://media.giphy.com/media/lTYLtiktVNr0k3SVOP/giphy.gif",
  "https://media.giphy.com/media/p24SMLHXZhmUgKOx1F/giphy.gif",
  "https://media.giphy.com/media/7upMd5l83SsP2GMxmL/giphy.gif",
  "https://media.giphy.com/media/YQmyu4dbNa9qdNh4iI/giphy.gif",
  "https://media.giphy.com/media/sLwfBfMlWTDbVLJApS/giphy.gif"
] as const;

const CATEGORIES: { key: ScoreCategory | "Subtotal" | "Bonus"; label: string }[] = [
  { key: "Aces", label: "Aces" },
  { key: "Deuces", label: "Deuces" },
  { key: "Treys", label: "Treys" },
  { key: "Fours", label: "Fours" },
  { key: "Fives", label: "Fives" },
  { key: "Sixes", label: "Sixes" },
  { key: "Subtotal", label: "Sub.T (63)" },
  { key: "Bonus", label: "Bonus (35)" },
  { key: "Choice", label: "Choice" },
  { key: "FourOfAKind", label: "4-Kind" },
  { key: "FullHouse", label: "F.House" },
  { key: "SmallStraight", label: "S.Str." },
  { key: "LargeStraight", label: "L.Str." },
  { key: "Yacht", label: "Yacht" }
];

const formatScoreBoard = (state: GameState): string => {
  const players = state.players;
  const lines: string[] = [];

  let header = "Category  ";
  for (const p of players) {
    header += ` | ${p.playerName.substring(0, 4).padEnd(5)}`;
  }
  lines.push(header);
  lines.push("-".repeat(header.length));

  CATEGORIES.forEach((cat) => {
    if (cat.key === "Subtotal" || cat.key === "Choice") {
      lines.push("=".repeat(header.length));
    }
    let row = `${cat.label.padEnd(10)}`;
    for (const p of players) {
      let valStr = "-";
      if (cat.key === "Subtotal") {
        valStr = `${calculateUpperSectionSum(p.scoreBoard)}/63`;
      } else if (cat.key === "Bonus") {
        valStr = p.bonusScore.toString();
      } else {
        const val = p.scoreBoard[cat.key];
        if (val !== undefined) {
          valStr = val.toString();
        }
      }
      row += ` | ${valStr.padStart(5)}`;
    }
    lines.push(row);
  });

  lines.push("-".repeat(header.length));
  let totalRow = "Total     ";
  for (const p of players) {
    totalRow += ` | ${p.totalScore.toString().padStart(5)}`;
  }
  lines.push(totalRow);

  return "```\n" + lines.join("\n") + "\n```";
};

const formatColosseumScoreBoard = (
  nameA: string,
  nameB: string,
  sbA: Record<string, number> = {},
  sbB: Record<string, number> = {},
  totalA: number,
  totalB: number,
  bonusA: number,
  bonusB: number
): string => {
  const upperCats = ["Aces", "Deuces", "Treys", "Fours", "Fives", "Sixes"];
  const sumUpperA = upperCats.reduce((acc, c) => acc + (sbA[c] ?? 0), 0);
  const sumUpperB = upperCats.reduce((acc, c) => acc + (sbB[c] ?? 0), 0);

  const colA = nameA.substring(0, 5).padEnd(5);
  const colB = nameB.substring(0, 5).padEnd(5);

  const lines: string[] = [];
  const header = `Category   | ${colA} | ${colB}`;
  lines.push(header);
  lines.push("-".repeat(header.length));

  CATEGORIES.forEach((cat) => {
    if (cat.key === "Subtotal" || cat.key === "Choice") {
      lines.push("=".repeat(header.length));
    }
    const label = cat.label.padEnd(10);
    let valA = "-";
    let valB = "-";

    if (cat.key === "Subtotal") {
      valA = `${sumUpperA}/63`;
      valB = `${sumUpperB}/63`;
    } else if (cat.key === "Bonus") {
      valA = bonusA > 0 ? "35" : (sumUpperA >= 63 ? "35" : "0");
      valB = bonusB > 0 ? "35" : (sumUpperB >= 63 ? "35" : "0");
    } else {
      const vA = sbA[cat.key];
      const vB = sbB[cat.key];
      if (vA !== undefined) valA = vA.toString();
      if (vB !== undefined) valB = vB.toString();
    }

    lines.push(`${label} | ${valA.padStart(5)} | ${valB.padStart(5)}`);
  });

  lines.push("-".repeat(header.length));
  lines.push(`Total      | ${totalA.toString().padStart(5)} | ${totalB.toString().padStart(5)}`);

  return "```\n" + lines.join("\n") + "\n```";
};

export const DiscordResponseSerializerLive = Layer.succeed(
  DiscordResponseSerializer,
  {
    serializeGame: (state, holds = "00000", flyBrainUrl) => {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const isFinished = state.status === "Finished";

      let description = formatScoreBoard(state);

      if (state.players.some((p) => p.playerId === "AI_FLY_BRAIN") && flyBrainUrl) {
        description += `\n\n🧠 **[3D 초파리 두뇌 실시간 중계 보기](${flyBrainUrl})**`;
      }

      if (!isFinished) {
        const roundNumber = Math.min(12, Object.keys(currentPlayer.scoreBoard).length + 1);
        description += `\n**Round:** ${roundNumber} / 12`;
        description += `\n**Current Turn:** <@${currentPlayer.playerId}> (${currentPlayer.playerName})`;
        description += `\n**Rolls:** ${state.rollCount}/3`;

        if (state.rollCount > 0) {
          const topRow = state.currentDice.map((val) => DICE_EMOJIS[val] || val.toString()).join(" ");
          const bottomRow = state.currentDice.map((_, idx) => holds[idx] === "1" ? "🔒" : "▫️").join(" ");
          description += `\n**Current Dice:**\n${topRow}\n${bottomRow}`;
        } else {
          description += `\n**Current Dice:** (First roll pending)`;
        }
      } else {
        description += `\n🏆 **Game Finished!**`;
        if (state.surrenderedPlayerId) {
          const surrenderedPlayer = state.players.find((p) => p.playerId === state.surrenderedPlayerId);
          const winningPlayer = state.players.find((p) => p.playerId !== state.surrenderedPlayerId);
          if (state.mode === "single") {
            description += `\n🏳️ **Surrendered!**\n<@${state.players[0].playerId}> 님이 기권하였습니다.`;
          } else if (winningPlayer && surrenderedPlayer) {
            description += `\n🏳️ **Surrendered!**\nWinner: **${winningPlayer.playerName}** (상대방 기권 승)`;
          }
        } else {
          if (state.mode === "single") {
            description += `\nFinal Score: **${state.players[0].totalScore}**`;
          } else {
            const p1 = state.players[0];
            const p2 = state.players[1];
            if (p1.totalScore > p2.totalScore) {
              description += `\nWinner: **${p1.playerName}** (${p1.totalScore} vs ${p2.totalScore})`;
            } else if (p2.totalScore > p1.totalScore) {
              description += `\nWinner: **${p2.playerName}** (${p2.totalScore} vs ${p1.totalScore})`;
            } else {
              description += `\nIt's a draw! (${p1.totalScore} vs ${p2.totalScore})`;
            }
          }
        }
      }

      if (state.turnHistory && state.turnHistory.length > 0) {
        const lastTurn = state.turnHistory[state.turnHistory.length - 1];
        const lastDice = lastTurn.rolls && lastTurn.rolls.length > 0 ? lastTurn.rolls[lastTurn.rolls.length - 1] : undefined;
        const diceEmojis = lastDice ? lastDice.map((val) => DICE_EMOJIS[val] || val.toString()).join(" ") : "(No dice rolled)";
        const rollTimes = lastTurn.rolls ? lastTurn.rolls.length : 0;
        const categoryLabel = CATEGORIES.find((c) => c.key === lastTurn.category)?.label || lastTurn.category;

        description += `\n\n💬 **Last Turn Action:**`;
        description += `\n**${lastTurn.playerName}** recorded **${lastTurn.score} pts** in **${categoryLabel}**`;
        description += `\nDice: ${diceEmojis} (Rolled ${rollTimes} times)`;
      }

      const embed: DiscordEmbed = {
        title: "🎲 Yacht Dice Game",
        description,
        color: 0x5865F2,
        footer: { text: `Game ID: ${state.gameId}` }
      };

      const components: DiscordActionRow[] = [];

      const isAiTurn = currentPlayer.playerId === "AI_FLY_BRAIN";

      if (!isFinished) {
        // Row 1: Dice hold/unhold buttons
        if (state.rollCount > 0 && state.rollCount < 3) {
          const holdButtons = state.currentDice.map((val, idx) => {
            const isHeld = holds[idx] === "1";
            const newHolds = holds.split("").map((h, i) => i === idx ? (h === "1" ? "0" : "1") : h).join("");
            const emojiName = DICE_BUTTON_EMOJIS[val];
            return {
              type: 2 as const,
              style: isHeld ? (3 as const) : (2 as const),
              label: isHeld ? "🔒" : `[${idx + 1}]`,
              emoji: { name: emojiName },
              custom_id: `hold_${idx}_${newHolds}`,
              disabled: isAiTurn
            };
          });
          components.push({
            type: 1,
            components: holdButtons
          });
        }

        // Row 2: Roll & Surrender buttons
        const canRoll = state.rollCount < 3;
        const isAllHeld = state.rollCount > 0 && holds === "11111";
        const rollLabel = isAiTurn
          ? `🪰 초파리 두뇌 연산 중... (${state.rollCount}/3)`
          : (isAllHeld ? "All Dice Held" : `Roll Dice (${state.rollCount}/3)`);

        const rollButton = {
          type: 2 as const,
          style: 1 as const,
          label: rollLabel,
          emoji: { name: "🎲" },
          custom_id: `roll_${holds}`,
          disabled: !canRoll || isAllHeld || isAiTurn
        };
        const surrenderButton = {
          type: 2 as const,
          style: 4 as const, // Danger (Red)
          emoji: { name: "🏳️" },
          custom_id: "surrender"
        };
        const refreshButton = {
          type: 2 as const,
          style: 2 as const, // Secondary (Gray)
          emoji: { name: "🔄" },
          custom_id: "refresh_game"
        };
        components.push({
          type: 1,
          components: [rollButton, surrenderButton, refreshButton]
        });

        // Row 3: Select Menu for category scoring (human player only)
        if (state.rollCount > 0 && !isAiTurn) {
          const selectOptions = CATEGORIES.filter(c => c.key !== "Subtotal" && c.key !== "Bonus" && currentPlayer.scoreBoard[c.key as ScoreCategory] === undefined)
            .map(c => {
              const estimatedScore = calculateScore(c.key as ScoreCategory, state.currentDice);
              return {
                label: `${c.label} (+${estimatedScore} pts)`,
                value: c.key,
                description: `Score current dice in ${c.label}`
              };
            });

          if (selectOptions.length > 0) {
            components.push({
              type: 1,
              components: [
                {
                  type: 3 as const,
                  custom_id: "select_category",
                  placeholder: "Select category to write score...",
                  options: selectOptions
                }
              ]
            });
          }
        }
      }

      return {
        type: 7, // UpdateMessage
        data: {
          embeds: [embed],
          components: components
        }
      };
    },

    serializeRolling: (state, holds = "00000", flyBrainUrl) => {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const nextRollCount = Math.min(3, state.rollCount + 1);

      let description = formatScoreBoard(state);

      if (state.players.some((p) => p.playerId === "AI_FLY_BRAIN") && flyBrainUrl) {
        description += `\n\n🧠 **[3D 초파리 두뇌 실시간 중계 보기](${flyBrainUrl})**`;
      }
      const roundNumber = Math.min(12, Object.keys(currentPlayer.scoreBoard).length + 1);
      description += `\n**Round:** ${roundNumber} / 12`;
      description += `\n**Current Turn:** <@${currentPlayer.playerId}> (${currentPlayer.playerName})`;
      description += `\n**Rolls:** ${nextRollCount}/3`;
      description += `\n**Current Dice:** 🎲 **Rolling the dice...**`;

      const randomGiphy = DICE_ROLL_GIPHY_POOL[Math.floor(Math.random() * DICE_ROLL_GIPHY_POOL.length)];

      const embed: DiscordEmbed = {
        title: "🎲 Yacht Dice Game",
        description,
        color: 0x5865F2,
        image: {
          url: randomGiphy
        },
        footer: { text: `Game ID: ${state.gameId}` }
      };

      const components: DiscordActionRow[] = [];

      // Row 1: Hold buttons (all disabled)
      if (state.rollCount > 0 && state.rollCount < 3) {
        const holdButtons = state.currentDice.map((val, idx) => {
          const isHeld = holds[idx] === "1";
          const emojiName = DICE_BUTTON_EMOJIS[val];
          return {
            type: 2 as const,
            style: isHeld ? (3 as const) : (2 as const),
            label: isHeld ? "🔒" : `[${idx + 1}]`,
            emoji: { name: emojiName },
            custom_id: `disabled_hold_${idx}`,
            disabled: true
          };
        });
        components.push({
          type: 1,
          components: holdButtons
        });
      }

      // Row 2: Roll & Surrender buttons (disabled)
      const isAllHeld = state.rollCount > 0 && holds === "11111";
      const rollButton = {
        type: 2 as const,
        style: 1 as const,
        label: isAllHeld ? "All Dice Held" : `Rolling...`,
        emoji: { name: "🎲" },
        custom_id: `disabled_roll`,
        disabled: true
      };
      const surrenderButton = {
        type: 2 as const,
        style: 4 as const,
        emoji: { name: "🏳️" },
        custom_id: `disabled_surrender`,
        disabled: true
      };
      components.push({
        type: 1,
        components: [rollButton, surrenderButton]
      });

      // Row 3: Select Menu (all disabled if it was visible)
      if (state.rollCount > 0) {
        const selectOptions = CATEGORIES.filter(c => c.key !== "Subtotal" && c.key !== "Bonus" && currentPlayer.scoreBoard[c.key as ScoreCategory] === undefined)
          .map(c => {
            const estimatedScore = calculateScore(c.key as ScoreCategory, state.currentDice);
            return {
              label: `${c.label} (+${estimatedScore} pts)`,
              value: c.key,
              description: `Score current dice in ${c.label}`
            };
          });

        if (selectOptions.length > 0) {
          components.push({
            type: 1,
            components: [
              {
                type: 3 as const,
                custom_id: "disabled_select_category",
                placeholder: "Rolling dice...",
                options: selectOptions.map(opt => ({ ...opt })),
                disabled: true
              }
            ]
          });
        }
      }

      return {
        type: 7, // UpdateMessage
        data: {
          embeds: [embed],
          components: components.length > 0 ? components : undefined
        }
      };
    },

    serializeLeaderboard: (topPlayers, mode) => {
      const fields = topPlayers.map((player, idx) => {
        const value = mode === "single"
          ? `Best Score: **${player.soloHighestScore}** | Played: **${player.soloPlayCount}**`
          : `Elo: **${player.elo}** | Wins: **${player.multiWins}** | Losses: **${player.multiLosses}** | Best Score: **${player.multiHighestScore}**`;
        return {
          name: `#${idx + 1} - ${player.name}`,
          value,
          inline: false
        };
      });

      const title = mode === "single"
        ? "🏆 Yacht Dice Leaderboard (Solo Mode)"
        : "🏆 Yacht Dice Leaderboard (Matching Mode)";

      const embed: DiscordEmbed = {
        title,
        description: (topPlayers.length === 0 ? "No records found yet. Be the first to play!" : "") +
          "\n\n🔗 **전체 ELO 순위 및 플레이어 대시보드**: [웹 대시보드 바로가기](https://discord-yachoo.woowong.workers.dev/web)",
        color: 0xFEE75C,
        fields: fields.length > 0 ? fields : undefined
      };

      return {
        type: 4, // ChannelMessageWithSource
        data: {
          embeds: [embed]
        }
      };
    },

    serializeError: (message) => ({
      type: 4,
      data: {
        content: `❌ **Error:** ${message}`,
        flags: 64
      }
    }),

    serializeMessage: (content) => ({
      type: 4,
      data: {
        content
      }
    }),

    serializeHistoryList: (recentMatches, userId) => {
      let description = recentMatches.length === 0
        ? "No recent matches found. Start a game with `/challenge`!"
        : recentMatches.map((m, idx) => {
            const isP1 = userId === m.player1Id;
            const isSingle = m.mode === "single";
            const playedDate = new Date(m.playedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric"
            });
            if (isSingle) {
              return `${idx + 1}️⃣ **Single Play** • Score: **${m.player1Score}** • *${playedDate}*\n\`ID: ${m.id}\``;
            } else {
              const opponentId = isP1 ? m.player2Id : m.player1Id;
              const myScore = isP1 ? m.player1Score : (m.player2Score ?? 0);
              const oppScore = isP1 ? (m.player2Score ?? 0) : m.player1Score;
              
              let outcome = m.winnerId === userId ? "Won 🏆" : (m.winnerId === null ? "Draw 🤝" : "Lost ❌");
              if (m.surrenderedId) {
                if (m.winnerId === userId) {
                  outcome = "Won (KO) 🏆";
                } else if (m.winnerId !== null) {
                  outcome = "Lost (KO) 🏳️";
                }
              }
              
              return `${idx + 1}️⃣ vs <@${opponentId}>: **${myScore}** vs **${oppScore}** (${outcome}) • *${playedDate}*\n\`ID: ${m.id}\``;
            }
          }).join("\n\n");

      const embed: DiscordEmbed = {
        title: "🏆 Recent Yacht Dice Matches",
        description: description + "\n\n🔗 **웹 대시보드에서 전체 보기**: [웹 대시보드 바로가기](https://discord-yachoo.woowong.workers.dev/web?player=" + userId + ")",
        color: 0x5865F2
      };

      const components: DiscordActionRow[] = [];
      if (recentMatches.length > 0) {
        const buttons = recentMatches.map((m, idx) => ({
          type: 2 as const,
          style: 2 as const,
          label: `Match ${idx + 1}`,
          custom_id: `viewhistory_${m.id}`
        }));
        components.push({
          type: 1,
          components: buttons
        });
      }

      return {
        type: 4, // ChannelMessageWithSource
        data: {
          embeds: [embed],
          components: components.length > 0 ? components : undefined
        }
      };
    },

    serializeHistoryDetails: (match, page) => {
      if (!match.historyJson) {
        return {
          type: 4,
          data: {
            content: "❌ Detailed history not available for this match.",
            flags: 64
          }
        };
      }

      let history: readonly TurnRecord[];
      try {
        const parsedHistory = JSON.parse(match.historyJson) as HistoryTurnRecord[];
        history = normalizeTurnHistory(parsedHistory);
      } catch (e) {
        return {
          type: 4,
          data: {
            content: "❌ Failed to parse match history.",
            flags: 64
          }
        };
      }

      // Group history by round (turnNumber)
      const roundsMap = new Map<number, TurnRecord[]>();
      for (const rec of history) {
        const list = roundsMap.get(rec.turnNumber) || [];
        list.push(rec);
        roundsMap.set(rec.turnNumber, list);
      }

      const startRound = page === 1 ? 1 : 7;
      const endRound = page === 1 ? 6 : 12;
      const lines: string[] = [];

      for (let r = startRound; r <= endRound; r++) {
        const turnRecs = roundsMap.get(r);
        if (!turnRecs || turnRecs.length === 0) continue;

        lines.push(`**Round ${r}**`);
        for (const rec of turnRecs) {
          const rollsStr = rec.rolls.map(roll => `\`[${roll.join(" ")}]\``).join(" ➔ ");
          lines.push(`• **${rec.playerName}**: ${rec.category} ➔ **${rec.score} pts** (누적 **${rec.cumulativeScore} pts**)`);
          lines.push(`  Rolls: ${rollsStr}`);
        }
        lines.push("");
      }

      const pageDesc = lines.join("\n");
      const matchHeader = match.mode === "single"
        ? `**Single Play** • Final Score: **${match.player1Score}**`
        : `<@${match.player1Id}> (**${match.player1Score}**) vs <@${match.player2Id}> (**${match.player2Score}**)`;

      const embed: DiscordEmbed = {
        title: `📜 Match Details: ${match.id} (Rounds ${page === 1 ? "1-6" : "7-12"})`,
        description: `${matchHeader}\n\n${pageDesc}\n\n🔗 **웹에서 전체 턴 자세히 복기하기**: [웹 대시보드 바로가기](https://discord-yachoo.woowong.workers.dev/web?player=${match.player1Id})`,
        color: 0x5865F2,
        footer: { text: `Played on ${new Date(match.playedAt).toLocaleDateString()}` }
      };

      const components: DiscordActionRow[] = [
        {
          type: 1,
          components: [
            {
              type: 2 as const,
              style: 2 as const,
              label: "◀ Rounds 1-6",
              custom_id: `pagehistory_${match.id}_1`,
              disabled: page === 1
            },
            {
              type: 2 as const,
              style: 2 as const,
              label: "Rounds 7-12 ▶",
              custom_id: `pagehistory_${match.id}_2`,
              disabled: page === 2
            },
            {
              type: 2 as const,
              style: 4 as const,
              label: "🔙 Back to List",
              custom_id: "backtohistorylist"
            }
          ]
        }
      ];

      return {
        type: 7, // UpdateMessage
        data: {
          embeds: [embed],
          components
        }
      };
    },

    serializeInvitation: (invitation) => {
      const embed: DiscordEmbed = {
        title: "🎲 야추 대결 초대장",
        description: `**${invitation.challengerName}**님이 <@${invitation.opponentId}>님에게 1v1 야추 대결을 신청하셨습니다!\n\n⏰ **유효시간**: 5분\n수락하시겠습니까?`,
        color: 0x5865F2,
        footer: { text: "만료 전 수락 버튼을 눌러 게임을 시작하세요!" }
      };

      const components: DiscordActionRow[] = [
        {
          type: 1,
          components: [
            {
              type: 2 as const,
              style: 3 as const, // Success Green
              label: "✅ 수락 (Accept)",
              custom_id: `invitation:accept:${invitation.id}`
            },
            {
              type: 2 as const,
              style: 4 as const, // Danger Red
              label: "❌ 거절 (Decline)",
              custom_id: `invitation:decline:${invitation.id}`
            },
            {
              type: 2 as const,
              style: 2 as const, // Secondary Gray
              emoji: { name: "🪰" },
              custom_id: `invitation:play_ai:${invitation.id}`
            }
          ]
        }
      ];

      return {
        type: 4,
        data: {
          embeds: [embed],
          components
        }
      };
    },

    serializeInvitationDeclined: (invitation) => {
      const embed: DiscordEmbed = {
        title: "🎲 야추 대결 초대 거절됨",
        description: `<@${invitation.opponentId}>님이 **${invitation.challengerName}**님의 야추 대결 초대를 거절하였습니다.`,
        color: 0xED4245
      };

      return {
        type: 7,
        data: {
          embeds: [embed],
          components: []
        }
      };
    },

    serializeMatchQueue: (queue) => {
      const embed: DiscordEmbed = {
        title: "🎲 야추 대결 공개 대기열",
        description: `**${queue.hostName}**님이 야추 대결 대기열을 생성했습니다!\n\n누구나 아래 **[참가하기]** 버튼을 눌러 즉시 1v1 대결을 시작할 수 있습니다.\n\n⏰ **유효시간**: 5분`,
        color: 0x57F287,
        footer: { text: "방장은 [대기 취소] 또는 [🪰] 버튼으로 즉시 초파리와 대결할 수 있습니다." }
      };

      const components: DiscordActionRow[] = [
        {
          type: 1,
          components: [
            {
              type: 2 as const,
              style: 3 as const, // Success Green
              label: "⚔️ 대결 참가하기",
              custom_id: `queue:join:${queue.id}`
            },
            {
              type: 2 as const,
              style: 2 as const, // Secondary Gray
              emoji: { name: "🪰" },
              custom_id: `queue:play_ai:${queue.id}`
            },
            {
              type: 2 as const,
              style: 2 as const, // Secondary Gray
              label: "❌ 대기 취소",
              custom_id: `queue:cancel:${queue.id}`
            }
          ]
        }
      ];

      return {
        type: 4,
        data: {
          embeds: [embed],
          components
        }
      };
    },

    serializeMatchQueueCancelled: (queue) => {
      const embed: DiscordEmbed = {
        title: "🎲 야추 대결 대기열 취소됨",
        description: `**${queue.hostName}**님이 야추 대결 대기열을 취소했습니다.`,
        color: 0x95A5A6
      };

      return {
        type: 7,
        data: {
          embeds: [embed],
          components: []
        }
      };
    },

    serializeColosseumMatch: (match, bets, flyBrainUrl) => {
      const pA = GLADIATOR_PERSONAS[match.personaAId as PersonaId] || GLADIATOR_PERSONAS.Jackpot;
      const pB = GLADIATOR_PERSONAS[match.personaBId as PersonaId] || GLADIATOR_PERSONAS.Newton;

      const betsA = bets.filter((b) => b.chosenPersona === "A");
      const betsB = bets.filter((b) => b.chosenPersona === "B");
      const totalAmountA = betsA.reduce((sum, b) => sum + b.amount, 0);
      const totalAmountB = betsB.reduce((sum, b) => sum + b.amount, 0);

      const embed: DiscordEmbed = {
        title: `🏛️ [초파리 콜로세움] 검투사 맞대결 & ELO 베팅`,
        description: `초파리 커넥톰 SNN 검투사들이 격돌합니다!\n승리할 것 같은 초파리에게 본인의 ELO를 베팅하세요.\n\n` +
          `⏱️ **베팅 상태**: 베팅 접수 중 (버튼을 클릭하여 20 ELO 베팅)\n` +
          (flyBrainUrl ? `🔗 **3D 실시간 관전**: [초파리 뇌 실시간 뷰어](${flyBrainUrl})\n` : ""),
        color: 0x9B59B6,
        fields: [
          {
            name: `${pA.emoji} [선수 1] ${pA.title}`,
            value: `• ELO: **${pA.elo}** | 스타일: *${pA.style}*\n• 승리 배당률: **${match.oddsA}배**\n• 현재 베팅 풀: **${totalAmountA} ELO** (${betsA.length}명)`,
            inline: true
          },
          {
            name: `${pB.emoji} [선수 2] ${pB.title}`,
            value: `• ELO: **${pB.elo}** | 스타일: *${pB.style}*\n• 승리 배당률: **${match.oddsB}배**\n• 현재 베팅 풀: **${totalAmountB} ELO** (${betsB.length}명)`,
            inline: true
          },
          {
            name: `📜 참여자 베팅 현황 (${bets.length}명 참여)`,
            value: bets.length > 0 
              ? bets.map((b) => `• **${b.userName}**: ${b.chosenPersona === "A" ? pA.emoji + " " + pA.name : pB.emoji + " " + pB.name}에 **${b.amount} ELO** (적중 시 +${Math.floor(b.amount * b.odds)} ELO)`).slice(0, 10).join("\n")
              : "아직 베팅한 유저가 없습니다. 아래 버튼으로 참여하세요!",
            inline: false
          }
        ],
        footer: {
          text: "파산 방지 룰: 800 ELO 이하 베팅 불가 | 1인당 1회 베팅 가능"
        }
      };

      const components: DiscordActionRow[] = [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 1, // Primary Blurple
              label: `${pA.emoji} ${pA.name} (+20 ELO)`,
              custom_id: `colosseum_bet:${match.id}:A:20`
            },
            {
              type: 2,
              style: 1, // Primary Blurple
              label: `${pB.emoji} ${pB.name} (+20 ELO)`,
              custom_id: `colosseum_bet:${match.id}:B:20`
            },
            {
              type: 2,
              style: 3, // Success Green
              label: "⚔️ 결투 시작!",
              custom_id: `colosseum_start:${match.id}`
            }
          ]
        }
      ];

      return {
        type: 4,
        data: {
          embeds: [embed],
          components
        }
      };
    },

    serializeColosseumRolling: (match, bets, duelData, act, flyBrainUrl) => {
      const pA = GLADIATOR_PERSONAS[match.personaAId as PersonaId] || GLADIATOR_PERSONAS.Jackpot;
      const pB = GLADIATOR_PERSONAS[match.personaBId as PersonaId] || GLADIATOR_PERSONAS.Newton;

      const actRounds: Record<number, number> = { 1: 3, 2: 6, 3: 9, 4: 12 };
      const targetRound = actRounds[act] || act * 3;
      const prevIndex = Math.max(0, targetRound - 2);
      const prevRound = duelData.rounds && duelData.rounds[prevIndex] ? duelData.rounds[prevIndex] : null;

      const scoreA = prevRound ? prevRound.a.total : 0;
      const scoreB = prevRound ? prevRound.b.total : 0;

      const actTitles: Record<number, string> = {
        1: "제1막: 초반 기선제압 & 탐색전 (R03)",
        2: "제2막: 상단 보너스 63점 사수 분수령 (R06)",
        3: "제3막: 클러치 야추/스트레이트 올인 승부처 (R09)",
        4: "제4막: 파이널 끝장 매치! 운명의 마지막 투척 (R12)"
      };
      const actTitle = actTitles[act] || `제${act}막 (R${targetRound} 격돌)`;

      const randomGiphy = DICE_ROLL_GIPHY_POOL[Math.floor(Math.random() * DICE_ROLL_GIPHY_POOL.length)];

      const scoreBoardA = prevRound?.a?.score_board || {};
      const scoreBoardB = prevRound?.b?.score_board || {};
      const bonusA = prevRound?.a?.upper_bonus || 0;
      const bonusB = prevRound?.b?.upper_bonus || 0;

      const asciiBoard = formatColosseumScoreBoard(
        pA.name,
        pB.name,
        scoreBoardA,
        scoreBoardB,
        scoreA,
        scoreB,
        bonusA,
        bonusB
      );

      const embed: DiscordEmbed = {
        title: `🎲 [초파리 콜로세움] ${actTitle} - 주사위 컵 셰이킹 중...!!`,
        description: `**${pA.emoji} ${pA.name}** [${scoreA}점] vs **${pB.emoji} ${pB.name}** [${scoreB}점]\n` +
          `🔥 **검투사들이 주사위 컵을 맹렬히 흔들고 있습니다! 쉐킷쉐킷-!!**\n\n` +
          `${asciiBoard}\n` +
          (flyBrainUrl ? `🔗 [3D 초파리 두뇌 실시간 관전](${flyBrainUrl})\n` : ""),
        color: 0xE67E22,
        image: {
          url: randomGiphy
        },
        fields: [
          {
            name: `${pA.emoji} ${pA.title}의 주사위 투척 준비!`,
            value: `🎲 주사위 컵을 격렬하게 회전시키는 중...\n💬 "주사위 신이시여!! 대박 한 방만 부탁드립니다 붕붕붕!!"`,
            inline: false
          },
          {
            name: `${pB.emoji} ${pB.title}의 주사위 투척 준비!`,
            value: `🎲 공기 역학적 각도로 컵 조준 중...\n💬 "물리법칙에 오차는 없다. 계획된 족보로 들어간다 붕!"`,
            inline: false
          }
        ],
        footer: {
          text: `주사위가 테이블 위로 쏟아집니다... (약 3초 후 결과 공개!)`
        }
      };

      return {
        type: 7,
        data: {
          embeds: [embed],
          components: []
        }
      };
    },

    serializeColosseumClash: (match, bets, duelData, act, flyBrainUrl) => {
      const pA = GLADIATOR_PERSONAS[match.personaAId as PersonaId] || GLADIATOR_PERSONAS.Jackpot;
      const pB = GLADIATOR_PERSONAS[match.personaBId as PersonaId] || GLADIATOR_PERSONAS.Newton;

      const actRounds: Record<number, number> = { 1: 3, 2: 6, 3: 9, 4: 12 };
      const targetRound = actRounds[act] || act * 3;
      const rIndex = targetRound - 1;
      const roundInfo = duelData.rounds && duelData.rounds[rIndex]
        ? duelData.rounds[rIndex]
        : (duelData.rounds && duelData.rounds.length > 0 ? duelData.rounds[duelData.rounds.length - 1] : null);

      const scoreA = roundInfo ? roundInfo.a.total : 0;
      const scoreB = roundInfo ? roundInfo.b.total : 0;
      const leaderStr = roundInfo?.leader === "A" ? `${pA.emoji} ${pA.name} 리드!` : (roundInfo?.leader === "B" ? `${pB.emoji} ${pB.name} 리드!` : "동점 접전!");

      const actTitles: Record<number, string> = {
        1: "제1막: 초반 기선제압 & 탐색전 (R03 적중!)",
        2: "제2막: 상단 보너스 63점 사수 분수령 (R06 전반 마감!)",
        3: "제3막: 클러치 야추/스트레이트 올인 승부처 (R09 격돌!)",
        4: "제4막: 파이널 끝장 매치! 운명의 마지막 투척 (R12 최종혈투!)"
      };
      const actTitle = actTitles[act] || `제${act}막 (R${targetRound} 득점 결과)`;

      const actColors: Record<number, number> = {
        1: 0x3498DB,
        2: 0x2ECC71,
        3: 0xE67E22,
        4: 0x9B59B6
      };
      const embedColor = actColors[act] || 0xE67E22;

      const renderDopamineGauge = (dopamine: number): string => {
        const percent = Math.min(250, Math.max(0, dopamine));
        const blocks = Math.round(percent / 25);
        const filled = "█".repeat(Math.min(10, blocks));
        const empty = "░".repeat(Math.max(0, 10 - blocks));
        return `[${filled}${empty}] ${Math.round(percent)}%`;
      };

      const formatDiceWithLocks = (dice: readonly number[] = [], holds: readonly boolean[] = []): string => {
        if (!dice || dice.length === 0) return "(주사위 대기 중)";
        const top = dice.map((d) => DICE_EMOJIS[d] || `[${d}]`).join(" ");
        const bottom = dice.map((_, i) => (holds[i] ? "🔒" : "▫️")).join(" ");
        return `${top}\n${bottom}`;
      };

      const scoreBoardA = roundInfo?.a?.score_board || {};
      const scoreBoardB = roundInfo?.b?.score_board || {};
      const bonusA = roundInfo?.a?.upper_bonus || 0;
      const bonusB = roundInfo?.b?.upper_bonus || 0;

      const asciiBoard = formatColosseumScoreBoard(
        pA.name,
        pB.name,
        scoreBoardA,
        scoreBoardB,
        scoreA,
        scoreB,
        bonusA,
        bonusB
      );

      const embed: DiscordEmbed = {
        title: `⚔️ [초파리 콜로세움] ${actTitle}`,
        description: `**${pA.emoji} ${pA.name}** [${scoreA}점] vs **${pB.emoji} ${pB.name}** [${scoreB}점]\n` +
          `⚡ **현재 전황**: **${leaderStr}** (역전 횟수: ${duelData.lead_changes || 0}회)\n\n` +
          `${asciiBoard}\n` +
          (flyBrainUrl ? `🔗 [3D 초파리 두뇌 실시간 관전](${flyBrainUrl})\n` : ""),
        color: embedColor,
        fields: [
          {
            name: `${pA.emoji} ${pA.title} (도파민: ${renderDopamineGauge(roundInfo?.a?.dopamine || 100)})`,
            value: `🎲 **최종 주사위 & 락**:\n${formatDiceWithLocks(roundInfo?.a?.dice, roundInfo?.a?.holds)}\n` +
              `🎯 **직전 족보**: **${roundInfo?.a?.category || "진행 중"}** (+${roundInfo?.a?.points || 0}점)\n` +
              `💬 ${roundInfo?.a?.dialogue || "붕붕~"}`,
            inline: false
          },
          {
            name: `${pB.emoji} ${pB.title} (도파민: ${renderDopamineGauge(roundInfo?.b?.dopamine || 100)})`,
            value: `🎲 **최종 주사위 & 락**:\n${formatDiceWithLocks(roundInfo?.b?.dice, roundInfo?.b?.holds)}\n` +
              `🎯 **직전 족보**: **${roundInfo?.b?.category || "진행 중"}** (+${roundInfo?.b?.points || 0}점)\n` +
              `💬 ${roundInfo?.b?.dialogue || "붕붕~"}`,
            inline: false
          }
        ],
        footer: {
          text: act < 4
            ? `다음 격돌 막으로 이동합니다... (${act}/4) | 약 3.5초 후 주사위 컵을 다시 흔듭니다.`
            : "최종 결과 및 ELO 정산을 집계 중입니다..."
        }
      };

      return {
        type: 7,
        data: {
          embeds: [embed],
          components: []
        }
      };
    },

    serializeColosseumResult: (match, bets, duelData, flyBrainUrl) => {
      const pA = GLADIATOR_PERSONAS[match.personaAId as PersonaId] || GLADIATOR_PERSONAS.Jackpot;
      const pB = GLADIATOR_PERSONAS[match.personaBId as PersonaId] || GLADIATOR_PERSONAS.Newton;
      const winner = duelData.winner as "A" | "B" | "DRAW";

      let winnerTitle = "";
      if (winner === "A") {
        winnerTitle = `🏆 승자: ${pA.emoji} ${pA.title}! (+${duelData.diff}점차 승리)`;
      } else if (winner === "B") {
        winnerTitle = `🏆 승자: ${pB.emoji} ${pB.title}! (+${duelData.diff}점차 승리)`;
      } else {
        winnerTitle = `🤝 무승부! 기적의 동점 드라마!`;
      }

      const settlementLines = bets.map((b) => {
        if (winner === "DRAW") {
          return `• **${b.userName}**: 무승부 환불 (±0 ELO)`;
        } else if (winner === b.chosenPersona) {
          const payout = Math.floor(b.amount * b.odds);
          const net = payout - b.amount;
          return `• **${b.userName}**: 적중! 🎉 **+${net} ELO** 획득 (총 ${payout} ELO 수령)`;
        } else {
          return `• **${b.userName}**: 예측 실패 💥 **-${b.amount} ELO**`;
        }
      });

      const lastRound = duelData.rounds && duelData.rounds.length > 0 ? duelData.rounds[duelData.rounds.length - 1] : null;
      const finalSbA = lastRound?.a?.score_board || {};
      const finalSbB = lastRound?.b?.score_board || {};
      const finalBonusA = duelData.upper_bonus_a ?? lastRound?.a?.upper_bonus ?? 0;
      const finalBonusB = duelData.upper_bonus_b ?? lastRound?.b?.upper_bonus ?? 0;

      const finalAsciiBoard = formatColosseumScoreBoard(
        pA.name,
        pB.name,
        finalSbA,
        finalSbB,
        duelData.score_a,
        duelData.score_b,
        finalBonusA,
        finalBonusB
      );

      const embed: DiscordEmbed = {
        title: `🏆 [초파리 콜로세움] 최종 경기 결과 발표!`,
        description: `**${winnerTitle}**\n\n` +
          `📊 **최종 스코어**: ${pA.emoji} ${pA.name} **${duelData.score_a}점** vs **${duelData.score_b}점** ${pB.emoji} ${pB.name}\n` +
          `⚡ **경기 역전 횟수**: 총 **${duelData.lead_changes}회**\n\n` +
          `${finalAsciiBoard}\n` +
          (flyBrainUrl ? `🔗 [3D 초파리 두뇌 뷰어](${flyBrainUrl})\n` : ""),
        color: winner === "DRAW" ? 0x95A5A6 : 0xF1C40F,
        fields: [
          {
            name: `💰 ELO 베팅 정산 결과 (${bets.length}명 참여)`,
            value: settlementLines.length > 0 ? settlementLines.join("\n") : "베팅 참여자가 없습니다.",
            inline: false
          }
        ],
        footer: {
          text: "다음 대결을 시작하려면 /colosseum 명령어를 사용하세요!"
        }
      };

      return {
        type: 7,
        data: {
          embeds: [embed],
          components: []
        }
      };
    }
  }
);
