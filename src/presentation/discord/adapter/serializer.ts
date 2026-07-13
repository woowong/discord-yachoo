import { Context, Layer } from "effect";
import { GameState, ScoreCategory, TurnRecord } from "../../../domain/types";
import { PlayerStats, MatchRecord } from "../../../persistence/repository";
import { calculateScore, calculateUpperSectionSum } from "../../../domain/score";
import { DiscordInteractionResponse, DiscordEmbed, DiscordActionRow } from "./types";

export interface DiscordResponseSerializer {
  readonly serializeGame: (state: GameState, holds?: string) => DiscordInteractionResponse;
  readonly serializeRolling: (state: GameState, holds?: string) => DiscordInteractionResponse;
  readonly serializeLeaderboard: (topPlayers: readonly PlayerStats[], mode: "single" | "multi") => DiscordInteractionResponse;
  readonly serializeError: (message: string) => DiscordInteractionResponse;
  readonly serializeMessage: (content: string) => DiscordInteractionResponse;
  readonly serializeHistoryList: (recentMatches: readonly MatchRecord[], userId: string) => DiscordInteractionResponse;
  readonly serializeHistoryDetails: (match: MatchRecord, page: number) => DiscordInteractionResponse;
}

export const DiscordResponseSerializer = Context.GenericTag<DiscordResponseSerializer>("@services/DiscordResponseSerializer");

const DICE_EMOJIS = ["", ":one:", ":two:", ":three:", ":four:", ":five:", ":six:"] as const;
const DICE_BUTTON_EMOJIS = ["", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"] as const;

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

export const DiscordResponseSerializerLive = Layer.succeed(
  DiscordResponseSerializer,
  {
    serializeGame: (state, holds = "00000") => {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const isFinished = state.status === "Finished";

      let description = formatScoreBoard(state);

      if (!isFinished) {
        const roundNumber = Math.min(12, Object.keys(currentPlayer.scoreBoard).length + 1);
        description += `\n**Round:** ${roundNumber} / 12`;
        description += `\n**Current Turn:** <@${currentPlayer.playerId}> (${currentPlayer.playerName})`;
        description += `\n**Rolls:** ${state.rollCount}/3`;

        if (state.rollCount > 0) {
          const diceFaces = state.currentDice.map((val, idx) => {
            const face = DICE_EMOJIS[val] || val.toString();
            const heldLabel = holds[idx] === "1" ? " [HELD]" : "";
            return `Dice ${idx + 1}: **${face}**${heldLabel}`;
          });
          description += `\n**Current Dice:**\n` + diceFaces.join("\n");
        } else {
          description += `\n**Current Dice:** (First roll pending)`;
        }
      } else {
        description += `\n🏆 **Game Finished!**`;
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
              label: `[${idx + 1}]${isHeld ? " Held" : ""}`,
              emoji: { name: emojiName },
              custom_id: `hold_${idx}_${newHolds}`
            };
          });
          components.push({
            type: 1,
            components: holdButtons
          });
        }

        // Row 2: Roll button
        const canRoll = state.rollCount < 3;
        const isAllHeld = state.rollCount > 0 && holds === "11111";
        const rollButton = {
          type: 2 as const,
          style: 1 as const,
          label: isAllHeld ? "All Dice Held" : `Roll Dice (${state.rollCount}/3)`,
          emoji: { name: "🎲" },
          custom_id: `roll_${holds}`,
          disabled: !canRoll || isAllHeld
        };
        components.push({
          type: 1,
          components: [rollButton]
        });

        // Row 3: Select Menu for category scoring
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

    serializeRolling: (state, holds = "00000") => {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const nextRollCount = Math.min(3, state.rollCount + 1);

      let description = formatScoreBoard(state);
      const roundNumber = Math.min(12, Object.keys(currentPlayer.scoreBoard).length + 1);
      description += `\n**Round:** ${roundNumber} / 12`;
      description += `\n**Current Turn:** <@${currentPlayer.playerId}> (${currentPlayer.playerName})`;
      description += `\n**Rolls:** ${nextRollCount}/3`;
      description += `\n**Current Dice:** 🎲 **Rolling the dice...**`;

      const embed: DiscordEmbed = {
        title: "🎲 Yacht Dice Game",
        description,
        color: 0x5865F2,
        image: {
          url: "https://media.giphy.com/media/VGoZVlR9naOZCiRLSy/giphy.gif"
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
            label: `[${idx + 1}]${isHeld ? " Held" : ""}`,
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

      // Row 2: Roll button (disabled, shows Rolling...)
      const isAllHeld = state.rollCount > 0 && holds === "11111";
      const rollButton = {
        type: 2 as const,
        style: 1 as const,
        label: isAllHeld ? "All Dice Held" : `Rolling...`,
        emoji: { name: "🎲" },
        custom_id: `disabled_roll`,
        disabled: true
      };
      components.push({
        type: 1,
        components: [rollButton]
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
        description: topPlayers.length === 0 ? "No records found yet. Be the first to play!" : undefined,
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
              const outcome = m.winnerId === userId ? "Won 🏆" : (m.winnerId === null ? "Draw 🤝" : "Lost ❌");
              return `${idx + 1}️⃣ vs <@${opponentId}>: **${myScore}** vs **${oppScore}** (${outcome}) • *${playedDate}*\n\`ID: ${m.id}\``;
            }
          }).join("\n\n");

      const embed: DiscordEmbed = {
        title: "🏆 Recent Yacht Dice Matches",
        description,
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

      let history: TurnRecord[];
      try {
        history = JSON.parse(match.historyJson);
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
          lines.push(`• **${rec.playerName}**: ${rec.category} ➔ **${rec.score} pts**`);
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
        description: `${matchHeader}\n\n${pageDesc}`,
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
    }
  }
);
