import { Effect, Layer, Option } from "effect";
import { GameState } from "../../domain/types";
import { Invitation, isInvitationExpired } from "../../domain/invitation";
import { MatchQueue, isMatchQueueExpired } from "../../domain/matchQueue";
import { GameRepository, InvitationRepository, MatchQueueRepository, RepositoryError } from "../repository";

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

export const InMemoryInvitationRepositoryLive = Layer.sync(
  InvitationRepository,
  () => {
    const store = new Map<string, Invitation>();
    return {
      save: (invitation: Invitation) =>
        Effect.sync(() => {
          store.set(invitation.id, invitation);
        }),
      findById: (id: string) =>
        Effect.sync(() => {
          const val = store.get(id);
          return Option.fromNullable(val);
        }),
      findActiveBetweenPlayers: (p1Id: string, p2Id: string) =>
        Effect.sync(() => {
          const now = Date.now();
          const active = Array.from(store.values()).find(
            (inv) =>
              inv.status === "PENDING" &&
              !isInvitationExpired(inv, now) &&
              ((inv.challengerId === p1Id && inv.opponentId === p2Id) ||
                (inv.challengerId === p2Id && inv.opponentId === p1Id))
          );
          return Option.fromNullable(active);
        }),
      updateStatus: (id: string, status: Invitation["status"]) =>
        Effect.sync(() => {
          const existing = store.get(id);
          if (existing) {
            store.set(id, { ...existing, status });
          }
        })
    };
  }
);

export const InMemoryMatchQueueRepositoryLive = Layer.sync(
  MatchQueueRepository,
  () => {
    const store = new Map<string, MatchQueue>();
    return {
      save: (queue: MatchQueue) =>
        Effect.sync(() => {
          store.set(queue.id, queue);
        }),
      findById: (id: string) =>
        Effect.sync(() => {
          const val = store.get(id);
          return Option.fromNullable(val);
        }),
      findActiveByHost: (hostId: string, guildId: string, channelId: string) =>
        Effect.sync(() => {
          const now = Date.now();
          const active = Array.from(store.values()).find(
            (q) =>
              q.status === "WAITING" &&
              !isMatchQueueExpired(q, now) &&
              q.hostId === hostId &&
              q.guildId === guildId &&
              q.channelId === channelId
          );
          return Option.fromNullable(active);
        }),
      updateStatus: (id: string, status: MatchQueue["status"]) =>
        Effect.sync(() => {
          const existing = store.get(id);
          if (existing) {
            store.set(id, { ...existing, status });
          }
        })
    };
  }
);

