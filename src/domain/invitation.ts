export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export interface Invitation {
  readonly id: string;
  readonly challengerId: string;
  readonly challengerName: string;
  readonly opponentId: string;
  readonly opponentName: string;
  readonly guildId: string;
  readonly channelId: string;
  readonly status: InvitationStatus;
  readonly createdAt: number;
}

export const INVITATION_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const isInvitationExpired = (invitation: Invitation, nowMs: number = Date.now()): boolean => {
  if (invitation.status !== "PENDING") {
    return false;
  }
  return nowMs - invitation.createdAt > INVITATION_TTL_MS;
};
