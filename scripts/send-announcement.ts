import process from "node:process";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const channelId = args.find((arg) => !arg.startsWith("--"));

const patchNoteEmbed = {
  title: "📢 디스코드 야추 다이스 업데이트 패치 노트 🎲",
  description: "이번 패치에서는 웹·Discord 복기의 점수 정확도와 대전 중 항복 절차의 안정성이 개선되었습니다!",
  color: 0x5865f2,
  fields: [
    {
      name: "1️⃣ 웹·Discord 복기 누적 점수 정확도 개선",
      value: "• 턴 기록에 상체 보너스(35점)를 포함한 **누적 점수**가 저장됩니다.\n• 웹 리플레이 표·점수 차이·라운드 그래프와 Discord `/history`가 실제 누적 점수를 표시합니다.\n• 기존 누적 점수 없는 기록도 상체 보너스를 재계산해 올바르게 표시합니다.",
      inline: false
    },
    {
      name: "2️⃣ 매치 기록 점수 보정 안정화",
      value: "• 레거시 경기 기록 보정 시 raw 턴 점수 합계를 최종 점수로 잘못 판단하지 않습니다.\n• 보너스가 이미 반영된 경기 점수는 유지하고, 필요한 기록만 보너스 포함 점수 기준으로 복구합니다.",
      inline: false
    },
    {
      name: "3️⃣ 매치 항복 제안 주체 보장",
      value: "• 항복 버튼을 누른 플레이어의 제안이 상대방에게 전달되며, 현재 턴과 관계없이 제안할 수 있습니다.\n• 상대방이 `[수락]`하면 **항복을 누른 사람이 패배**, 수락한 상대방이 K.O 승리로 처리됩니다.\n• `[거절]`하면 게임은 계속 진행되고, 이미 취소·처리된 제안은 만료되어 아무 상태도 변경하지 않습니다.",
      inline: false
    },
    {
      name: "4️⃣ 안전한 항복 상호작용",
      value: "• 제안자 본인이나 게임 참가자가 아닌 사용자의 수락·거절은 거부됩니다.\n• 일반 턴 행동으로 제안이 취소된 뒤 예전 버튼을 눌러도 게임 종료나 패배 기록이 발생하지 않습니다.",
      inline: false
    }
  ],
  footer: {
    text: "discord-yachoo • 2026-08-01 Patch Release"
  },
  timestamp: new Date().toISOString()
};

const payload = {
  content: "🎲 **[discord-yachoo] 최신 패치 소식이 도착했습니다!**",
  embeds: [patchNoteEmbed]
};

async function sendAnnouncement() {
  if (!channelId) {
    console.error("❌ Error: Channel ID is required.");
    console.error("Usage: DISCORD_TOKEN=xxx npx tsx scripts/send-announcement.ts <CHANNEL_ID> [--dry-run]");
    console.error("Example: DISCORD_TOKEN=xxx npm run announce -- 123456789012345678");
    process.exit(1);
  }

  if (isDryRun) {
    console.log("🔍 [DRY RUN MODE] The following payload will be sent to channel:", channelId);
    console.log(JSON.stringify(payload, null, 2));
    console.log("\n✅ Dry run complete. No HTTP request was sent.");
    return;
  }

  let token = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    try {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const devVarsPath = path.resolve(process.cwd(), ".dev.vars");
      if (fs.existsSync(devVarsPath)) {
        const content = fs.readFileSync(devVarsPath, "utf-8");
        const match = content.match(/DISCORD_BOT_TOKEN=["']?([^"'\r\n]+)["']?/);
        if (match) {
          token = match[1];
        }
      }
    } catch (_) {
      // ignore
    }
  }

  if (!token) {
    console.error("❌ Error: DISCORD_TOKEN or DISCORD_BOT_TOKEN environment variable is required.");
    console.error("Usage: DISCORD_TOKEN=xxx npx tsx scripts/send-announcement.ts <CHANNEL_ID>");
    process.exit(1);
  }

  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
  console.log(`🚀 Sending announcement to channel ${channelId}...`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const data = (await response.json()) as { id?: string };
    console.log(`🎉 Announcement successfully posted! Message ID: ${data.id}`);
  } catch (error) {
    console.error("❌ Failed to send announcement:", error);
    process.exit(1);
  }
}

sendAnnouncement();
