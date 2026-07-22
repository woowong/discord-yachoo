import { describe, it, expect } from "vitest";
import { isInvitationExpired, Invitation } from "./invitation";

describe("Invitation domain logic", () => {
  it("should not be expired when within 5 minutes (300,000ms)", () => {
    const now = 1000000;
    const inv: Invitation = {
      id: "inv-1",
      challengerId: "user-1",
      challengerName: "User 1",
      opponentId: "user-2",
      opponentName: "User 2",
      guildId: "guild-1",
      channelId: "channel-1",
      status: "PENDING",
      createdAt: now - 200000
    };

    expect(isInvitationExpired(inv, now)).toBe(false);
  });

  it("should be expired when older than 5 minutes (300,000ms)", () => {
    const now = 1000000;
    const inv: Invitation = {
      id: "inv-1",
      challengerId: "user-1",
      challengerName: "User 1",
      opponentId: "user-2",
      opponentName: "User 2",
      guildId: "guild-1",
      channelId: "channel-1",
      status: "PENDING",
      createdAt: now - 300001
    };

    expect(isInvitationExpired(inv, now)).toBe(true);
  });
});
