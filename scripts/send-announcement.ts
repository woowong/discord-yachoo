import process from "node:process";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const channelId = args.find((arg) => !arg.startsWith("--"));

const patchNoteEmbed = {
  title: "📢 디스코드 야추 다이스 업데이트 패치 노트 🎲",
  description: "이번 패치에서는 대전 매칭 편의성 강화와 항복 절차 개선, 웹 대시보드 리플레이 분석 기능이 새로 추가되었습니다!",
  color: 0x5865f2,
  fields: [
    {
      name: "1️⃣ 5분 제한 지목 초대전 (`/yachoo challenge @상대방`)",
      value: "• 상대방을 지정하여 대전을 신청하면 **5분 대기 초대전**이 전송됩니다.\n• 지목받은 플레이어는 `[수락]` 또는 `[거절]` 버튼으로 시작/거절할 수 있으며, 5분이 지나면 초대가 자동 만료됩니다.\n• *(상대 지정 없이 실행 시 기존처럼 1인 싱글 모드가 즉시 시작됩니다.)*",
      inline: false
    },
    {
      name: "2️⃣ 오픈 매치메이킹 큐 (`/yachoo match`)",
      value: "• 누구나 빠르게 1v1 대전을 즐길 수 있는 **빠른 매칭 시스템**이 도입되었습니다!\n• `/yachoo match` 명령어로 대기열에 진입하면, 대기 중인 다른 플레이어와 즉시 1v1 대전이 연결됩니다.",
      inline: false
    },
    {
      name: "3️⃣ 매치 항복 제안 시스템 (Surrender Offer Flow)",
      value: "• 대전 중 항복 버튼 클릭 시 즉시 종료되지 않고, 상대방에게 **항복 제안**이 전달됩니다.\n• 상대방이 `[수락]`하면 즉시 K.O 승리로 종료되며, `[거절]` 시 경기가 계속 진행됩니다.",
      inline: false
    },
    {
      name: "4️⃣ 웹 대시보드 리플레이 '점수 차이(Score Diff)' 추가",
      value: "• 웹 대시보드 매치 리플레이 뷰어에서 턴별 점수 외에 **실시간 스코어 격차(Score Diff)** 열이 새롭게 제공됩니다.",
      inline: false
    },
    {
      name: "5️⃣ 주사위 UI 정렬 & 렌더링 최적화",
      value: "• 주사위 홀드(Hold) 및 롤링 상태 표시 간격을 조정하여 디스코드 임베드 UI를 한층 깔끔하게 다듬었습니다.",
      inline: false
    }
  ],
  footer: {
    text: "discord-yachoo • 2026-07-23 Patch Release"
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
