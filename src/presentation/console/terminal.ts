import { Effect, Context, Layer } from "effect";
import * as readline from "readline";

export class TerminalError {
  readonly _tag = "TerminalError";
  constructor(readonly error: unknown) {}
}

export interface Terminal {
  readonly readline: (prompt: string) => Effect.Effect<string, TerminalError>;
  readonly writeLine: (message: string) => Effect.Effect<void, never>;
  readonly clear: () => Effect.Effect<void, never>;
}

export const Terminal = Context.GenericTag<Terminal>("@services/Terminal");

export const TerminalLive = Layer.succeed(
  Terminal,
  {
    readline: (prompt: string) =>
      Effect.async<string, TerminalError>((resume) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        rl.question(prompt, (answer) => {
          rl.close();
          resume(Effect.succeed(answer));
        });
      }),
    writeLine: (message: string) =>
      Effect.sync(() => {
        console.log(message);
      }),
    clear: () =>
      Effect.sync(() => {
        console.clear();
      })
  }
);
