import { describe, it, expect } from "vitest";
import { isMatchQueueExpired, MatchQueue } from "./matchQueue";

describe("MatchQueue domain logic", () => {
  it("should not be expired when within 5 minutes", () => {
    const now = 1000000;
    const queue: MatchQueue = {
      id: "queue-1",
      hostId: "user-1",
      hostName: "User 1",
      guildId: "guild-1",
      channelId: "channel-1",
      status: "WAITING",
      createdAt: now - 150000
    };

    expect(isMatchQueueExpired(queue, now)).toBe(false);
  });

  it("should be expired when older than 5 minutes", () => {
    const now = 1000000;
    const queue: MatchQueue = {
      id: "queue-1",
      hostId: "user-1",
      hostName: "User 1",
      guildId: "guild-1",
      channelId: "channel-1",
      status: "WAITING",
      createdAt: now - 300001
    };

    expect(isMatchQueueExpired(queue, now)).toBe(true);
  });
});
