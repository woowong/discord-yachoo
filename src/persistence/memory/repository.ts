import { Effect, Context, Layer, Option } from "effect";
import { GameState } from "../../domain/types";

export class RepositoryError {
  readonly _tag = "RepositoryError";
  constructor(readonly message: string) {}
}

export interface GameRepository {
  readonly save: (state: GameState) => Effect.Effect<void, RepositoryError>;
  readonly findById: (gameId: string) => Effect.Effect<Option.Option<GameState>, RepositoryError>;
}

export const GameRepository = Context.GenericTag<GameRepository>("@services/GameRepository");

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
