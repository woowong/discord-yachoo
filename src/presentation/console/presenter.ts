import { Effect, Context, Layer } from "effect";
import { GameState, PlayerState, ScoreCategory } from "../../domain/types";
import { Terminal, TerminalLive } from "./terminal";
import { getDiceUnicode } from "./dice-helper";
import { calculateUpperSectionSum } from "../../domain/score";

export interface ConsolePresenter {
  readonly renderBoard: (state: GameState) => Effect.Effect<void, never>;
  readonly renderError: (error: string) => Effect.Effect<void, never>;
}

export const ConsolePresenter = Context.GenericTag<ConsolePresenter>("@services/ConsolePresenter");

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

export const ConsolePresenterLive = Layer.effect(
  ConsolePresenter,
  Effect.gen(function* () {
    const terminal = yield* Terminal;

    const renderBoard = (state: GameState) =>
      Effect.gen(function* () {
        yield* terminal.clear();
        yield* terminal.writeLine("┌────────────────────────────────────────────────────────┐");
        yield* terminal.writeLine(`│                   YACHT DICE SIMULATOR                 │`);
        yield* terminal.writeLine(`│                   Game ID: ${state.gameId.padEnd(20)}        │`);
        yield* terminal.writeLine("├────────────────────────────────────────────────────────┤");

        // Prepare player scoreboard rows
        const players = state.players;
        const playerColumns: string[][] = players.map((player) => {
          const cols: string[] = [];
          cols.push(`  Player: ${player.playerName}`.padEnd(25));
          
          CATEGORIES.forEach((cat) => {
            let valStr = "-";
            if (cat.key === "Subtotal") {
              valStr = calculateUpperSectionSum(player.scoreBoard).toString();
            } else if (cat.key === "Bonus") {
              valStr = player.bonusScore.toString();
            } else {
              const val = player.scoreBoard[cat.key];
              if (val !== undefined) {
                valStr = val.toString();
              }
            }
            cols.push(`  [ ${cat.label.padEnd(12)} : ${valStr.padStart(3)} ]`);
          });
          cols.push(`  [ TOTAL SCORE  : ${player.totalScore.toString().padStart(3)} ]`);
          return cols;
        });

        // If single player, just print 1 column
        if (playerColumns.length === 1) {
          const cols = playerColumns[0];
          for (const row of cols) {
            yield* terminal.writeLine(`│ ${row.padEnd(54)} │`);
          }
        } else {
          // If multiplayer (2 players), print side-by-side
          const rowCount = playerColumns[0].length;
          for (let i = 0; i < rowCount; i++) {
            const p1Row = playerColumns[0][i];
            const p2Row = playerColumns[1][i];
            // Split with divider or empty space
            yield* terminal.writeLine(`│ ${p1Row}   ${p2Row} │`);
          }
        }

        yield* terminal.writeLine("├────────────────────────────────────────────────────────┤");
        
        if (state.status === "Finished") {
          yield* terminal.writeLine("│                     GAME OVER!                         │");
          
          let winnerMsg = "";
          if (state.mode === "single") {
            winnerMsg = `Final Score: ${state.players[0].totalScore}`;
          } else {
            const p1 = state.players[0];
            const p2 = state.players[1];
            if (p1.totalScore > p2.totalScore) {
              winnerMsg = `Winner: ${p1.playerName} (${p1.totalScore} vs ${p2.totalScore})`;
            } else if (p2.totalScore > p1.totalScore) {
              winnerMsg = `Winner: ${p2.playerName} (${p2.totalScore} vs ${p1.totalScore})`;
            } else {
              winnerMsg = `Tie Game! (${p1.totalScore} vs ${p2.totalScore})`;
            }
          }
          yield* terminal.writeLine(`│  ${winnerMsg.padEnd(52)}  │`);
          yield* terminal.writeLine("└────────────────────────────────────────────────────────┘");
          return;
        }

        if (state.turnHistory && state.turnHistory.length > 0) {
          const lastTurn = state.turnHistory[state.turnHistory.length - 1];
          const categoryLabel = CATEGORIES.find((c) => c.key === lastTurn.category)?.label || lastTurn.category;
          const lastDice = lastTurn.rolls && lastTurn.rolls.length > 0 ? lastTurn.rolls[lastTurn.rolls.length - 1] : undefined;
          const lastDiceStr = lastDice ? lastDice.map((d) => getDiceUnicode(d)).join(" ") : "(No dice)";
          const rollTimes = lastTurn.rolls ? lastTurn.rolls.length : 0;

          const actionMsg = `[Last Action] ${lastTurn.playerName} scored ${lastTurn.score} pts in ${categoryLabel}`;
          yield* terminal.writeLine(`│  ${actionMsg.padEnd(52)}  │`);

          const diceMsg = `Dice: ${lastDiceStr} (Rolled ${rollTimes} times)`;
          yield* terminal.writeLine(`│  ${diceMsg.padEnd(52)}  │`);

          yield* terminal.writeLine("├────────────────────────────────────────────────────────┤");
        }

        const activePlayer = state.players[state.currentPlayerIndex];
        const roundNumber = Math.min(12, Object.keys(activePlayer.scoreBoard).length + 1);
        yield* terminal.writeLine(`│  Current Turn: ${activePlayer.playerName.padEnd(20)} (Round ${roundNumber}/12, Roll ${state.rollCount}/3)  │`);

        const diceStr = state.currentDice
          .map((d) => `[ ${getDiceUnicode(d)} ]`)
          .join(" ");
        yield* terminal.writeLine(`│  Dice: ${diceStr.padEnd(46)}  │`);
        yield* terminal.writeLine(`│        ( 1 )   ( 2 )   ( 3 )   ( 4 )   ( 5 )           │`);
        yield* terminal.writeLine("└────────────────────────────────────────────────────────┘");
      });

    const renderError = (error: string) =>
      terminal.writeLine(`\x1b[31mError: ${error}\x1b[0m`);

    return {
      renderBoard,
      renderError
    };
  })
).pipe(Layer.provide(TerminalLive));
