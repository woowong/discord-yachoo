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
        }),
      delete: (gameId: string) =>
        Effect.sync(() => {
          store.delete(gameId);
        }),
      findActiveGameByPlayers: (player1Id: string, player2Id: string) =>
        Effect.sync(() => {
          const activeGame = Array.from(store.values()).find(
            (g) =>
              g.status !== "Finished" &&
              g.mode === "multi" &&
              g.players.some((p) => p.playerId === player1Id) &&
              g.players.some((p) => p.playerId === player2Id)
          );
          return Option.fromNullable(activeGame);
        })
    };
  }
);
