import { Effect, Layer, Option } from "effect";
import { GameState } from "../../domain/types";
import { Invitation, isInvitationExpired } from "../../domain/invitation";
import { MatchQueue, isMatchQueueExpired } from "../../domain/matchQueue";
import { GameRepository, InvitationRepository, MatchQueueRepository, ColosseumRepository, ColosseumMatchRecord, ColosseumBetRecord, RepositoryError } from "../repository";

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

export const InMemoryColosseumRepositoryLive = Layer.sync(
  ColosseumRepository,
  () => {
    const matches = new Map<string, ColosseumMatchRecord>();
    const bets = new Map<string, ColosseumBetRecord>();

    return {
      createMatch: (match: ColosseumMatchRecord) =>
        Effect.sync(() => {
          matches.set(match.id, match);
        }),

      getMatchById: (id: string) =>
        Effect.sync(() => {
          const val = matches.get(id);
          return Option.fromNullable(val);
        }),

      updateMatchStatus: (id: string, status: ColosseumMatchRecord["status"], messageId?: string | null) =>
        Effect.sync(() => {
          const existing = matches.get(id);
          if (existing) {
            matches.set(id, {
              ...existing,
              status,
              messageId: messageId !== undefined && messageId !== null ? messageId : existing.messageId,
            });
          }
        }),

      finishMatch: (id: string, winner: "A" | "B" | "DRAW", scoreA: number, scoreB: number, timelineJson: string) =>
        Effect.sync(() => {
          const existing = matches.get(id);
          if (existing) {
            matches.set(id, {
              ...existing,
              status: "COMPLETED",
              winner,
              scoreA,
              scoreB,
              timelineJson,
              closedAt: new Date()
            });
          }
        }),

      placeBet: (bet: ColosseumBetRecord) =>
        Effect.sync(() => {
          bets.set(bet.id, bet);
        }),

      getBetsByMatchId: (matchId: string) =>
        Effect.sync(() => {
          return Array.from(bets.values()).filter((b) => b.matchId === matchId);
        }),

      getUserBetInMatch: (matchId: string, userId: string) =>
        Effect.sync(() => {
          const found = Array.from(bets.values()).find((b) => b.matchId === matchId && b.userId === userId);
          return Option.fromNullable(found);
        }),

      updateBetPayout: (id: string, payout: number, status: ColosseumBetRecord["status"]) =>
        Effect.sync(() => {
          const existing = bets.get(id);
          if (existing) {
            bets.set(id, { ...existing, payout, status });
          }
        })
    };
  }
);


