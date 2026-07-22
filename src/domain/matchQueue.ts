export type MatchQueueStatus = "WAITING" | "MATCHED" | "CANCELLED" | "EXPIRED";

export interface MatchQueue {
  readonly id: string;
  readonly hostId: string;
  readonly hostName: string;
  readonly guildId: string;
  readonly channelId: string;
  readonly status: MatchQueueStatus;
  readonly createdAt: number;
}

export const MATCH_QUEUE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const isMatchQueueExpired = (queue: MatchQueue, nowMs: number = Date.now()): boolean => {
  if (queue.status !== "WAITING") {
    return false;
  }
  return nowMs - queue.createdAt > MATCH_QUEUE_TTL_MS;
};
