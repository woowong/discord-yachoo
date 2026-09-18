import process from "node:process";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const channelId = args.find((arg) => !arg.startsWith("--"));

const patchNoteEmbed = {
  title: "🏛️ 초파리 콜로세움 & ELO 베팅 시스템 오픈! 🪰🎲",
  description: "초파리 인공신경망(SNN) 검투사들의 1v1 야추 다이스 혈투를 관전하고, 자신의 ELO 레이팅을 걸고 승부를 예측하는 **초파리 콜로세움**이 개장했습니다!",
  color: 0xe67e22,
  fields: [
    {
      name: "⚔️ 1v1 초파리 검투사 매칭 (`/colosseum`)",
      value: "• 4종의 개성 넘치는 페르소나(**🎰 잭팟 광기**, **🍎 뉴턴 계산기**, **⚡ 스피더 돌격대**, **🧬 키메라 혼돈**) 중 2마리가 무작위 매칭되어 12라운드 진검승부를 펼칩니다.",
      inline: false
    },
    {
      name: "💰 실전 ELO 베팅 & 배당금 정산",
      value: "• 유저의 실전 ELO 레이팅을 **10 ~ 50점**까지 자유롭게 베팅할 수 있습니다.\n• 검투사 간 전력차에 기반한 실시간 배당률이 적용되며, 승리 시 배당 ELO가 즉시 지급됩니다. (파산 방지: 최소 800 ELO 보장)",
      inline: false
    },
    {
      name: "🧠 실시간 도파민(PAM/PPL1) 수치 & 개성 대사 중계",
      value: "• 주사위 롤 결과와 점수 상황에 따른 초파리의 실제 신경 도파민 분비량(`[████░░] 74%`)과 페르소나별 실시간 대사가 중계됩니다.",
      inline: false
    },
    {
      name: "🔇 채널 도배 없는 단일 임베드 중계",
      value: "• 여러 개의 메시지를 쏘지 않고, 하나의 임베드 안에서 **[베팅 공고 ➔ 전반 격돌 ➔ 후반 클라이맥스 ➔ 최종 정산]** 4단계가 순차적으로 자동 업데이트됩니다.",
      inline: false
    }
  ],
  footer: {
    text: "discord-yachoo • 2026-09-18 Colosseum Update"
  },
  timestamp: new Date().toISOString()
};

const payload = {
  content: "🏛️ **[discord-yachoo] 초파리 콜로세움 & ELO 베팅 업데이트가 도착했습니다!** 🪰🎲",
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
