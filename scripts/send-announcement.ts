import process from "node:process";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const channelId = args.find((arg) => !arg.startsWith("--"));

const patchNoteEmbed = {
  title: "📢 디스코드 야추 다이스 업데이트 패치 노트 🎲",
  description: "이번 패치에서는 네트워크 지연이나 화면 멈춤 시 게임 보드를 즉시 동기화할 수 있는 새로고침 기능이 추가되었습니다!",
  color: 0x5865f2,
  fields: [
    {
      name: "1️⃣ 게임 보드 새로고침(🔄) 기능 추가",
      value: "• 게임 액션 버튼 영역(`[ 주사위 굴리기 ]`, `[ 기권 ]` 옆)에 **`[ 🔄 새로고침 ]`** 버튼이 추가되었습니다.\n• 네트워크 지연이나 Discord 상호작용 타임아웃으로 화면 턴 수가 맞지 않을 때 누르면, 즉시 서버의 최신 게임 상태로 화면이 동기화됩니다.",
      inline: false
    },
    {
      name: "2️⃣ 누구나 자유롭게 즉시 동기화",
      value: "• 내 턴이 아니어도 대기 중인 상대방이나 채널 참여자 누구나 새로고침 버튼을 눌러 최신 게임 진행 상태를 확인할 수 있습니다.\n• 추가 API 호출 없이 0ms급 즉시 응답으로 메시지가 갱신됩니다.",
      inline: false
    }
  ],
  footer: {
    text: "discord-yachoo • 2026-08-16 Patch Release"
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
