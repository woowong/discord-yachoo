import { Effect } from "effect";
import { TerminalLive } from "./terminal";
import { ConsolePresenterLive } from "./presenter";
import { InMemoryRepositoryLive } from "../../persistence/memory/repository";
import { runGame } from "./runner";

const main = runGame().pipe(
  Effect.provide(TerminalLive),
  Effect.provide(ConsolePresenterLive),
  Effect.provide(InMemoryRepositoryLive)
);

Effect.runPromise(main).catch((err) => {
  console.error("Fatal Error running simulator:", err);
});
