import { Effect, Layer, Option } from "effect";
import { GameState } from "../../domain/types";
import { GameRepository, RepositoryError } from "../repository";

export const InMemoryRepositoryLive = Layer.sync(
  GameRepository,
  () => {
    const store = new Map<string, GameState>();
    return {
      save: (state: GameState) =>
        Effect.sync(() => {
          store.set(state.gameId, state);
        }),
      findById: (gameId: string) =>
        Effect.sync(() => {
          const val = store.get(gameId);
          return Option.fromNullable(val);
        })
    };
  }
);
