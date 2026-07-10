import { Context, Layer } from "effect";
import { GameState, ScoreCategory } from "../../../domain/types";
import { PlayerStats } from "../../../persistence/repository";
import { calculateScore, calculateUpperSectionSum } from "../../../domain/score";
import { DiscordInteractionResponse, DiscordEmbed, DiscordActionRow } from "./types";

export interface DiscordResponseSerializer {
  readonly serializeGame: (state: GameState, holds?: string) => DiscordInteractionResponse;
  readonly serializeRolling: (state: GameState, holds?: string) => DiscordInteractionResponse;
  readonly serializeLeaderboard: (topPlayers: readonly PlayerStats[]) => DiscordInteractionResponse;
  readonly serializeError: (message: string) => DiscordInteractionResponse;
  readonly serializeMessage: (content: string) => DiscordInteractionResponse;
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
  { key: "Subtotal", label: "Subtotal" },
  { key: "Bonus", label: "Upper Bonus" },
  { key: "Choice", label: "Choice" },
  { key: "FourOfAKind", label: "4 of a Kind" },
  { key: "FullHouse", label: "Full House" },
  { key: "SmallStraight", label: "Small Str." },
  { key: "LargeStraight", label: "Large Str." },
  { key: "Yacht", label: "Yacht" }
];

const formatScoreBoard = (state: GameState): string => {
  const players = state.players;
  const lines: string[] = [];

  let header = "Category     ";
  for (const p of players) {
    header += ` | ${p.playerName.substring(0, 10).padEnd(10)}`;
  }
  lines.push(header);
  lines.push("-".repeat(header.length));

  CATEGORIES.forEach((cat) => {
    let row = `${cat.label.padEnd(12)}`;
    for (const p of players) {
      let valStr = "-";
      if (cat.key === "Subtotal") {
        valStr = calculateUpperSectionSum(p.scoreBoard).toString();
      } else if (cat.key === "Bonus") {
        valStr = p.bonusScore.toString();
      } else {
        const val = p.scoreBoard[cat.key];
        if (val !== undefined) {
          valStr = val.toString();
        }
      }
      row += ` | ${valStr.padStart(10)}`;
    }
    lines.push(row);
  });

  lines.push("-".repeat(header.length));
  let totalRow = "Total        ";
  for (const p of players) {
    totalRow += ` | ${p.totalScore.toString().padStart(10)}`;
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
        const rollButton = {
          type: 2 as const,
          style: 1 as const,
          label: `Roll Dice (${state.rollCount}/3)`,
          emoji: { name: "🎲" },
          custom_id: `roll_${holds}`,
          disabled: !canRoll
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
          components: components.length > 0 ? components : undefined
        }
      };
    },

    serializeRolling: (state, holds = "00000") => {
      const currentPlayer = state.players[state.currentPlayerIndex];
      const nextRollCount = Math.min(3, state.rollCount + 1);

      let description = formatScoreBoard(state);
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
      const rollButton = {
        type: 2 as const,
        style: 1 as const,
        label: `Rolling...`,
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

    serializeLeaderboard: (topPlayers) => {
      const fields = topPlayers.map((player, idx) => ({
        name: `#${idx + 1} - ${player.name}`,
        value: `Wins: **${player.wins}** | Losses: **${player.losses}** | Best Score: **${player.highestScore}**`,
        inline: false
      }));

      const embed: DiscordEmbed = {
        title: "🏆 Yacht Dice Leaderboard",
        description: topPlayers.length === 0 ? "No records found yet. Be the first to win!" : undefined,
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
    })
  }
);
