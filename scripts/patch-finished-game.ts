import { Effect } from "effect";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { DiscordResponseSerializer, DiscordResponseSerializerLive } from "../src/presentation/discord/adapter/serializer";
import { GameState } from "../src/domain/types";

// 1. Parse Bot Token from .dev.vars or environment
function getBotToken(): string {
  try {
    const devVarsPath = path.resolve(process.cwd(), ".dev.vars");
    if (fs.existsSync(devVarsPath)) {
      const content = fs.readFileSync(devVarsPath, "utf-8");
      const match = content.match(/DISCORD_BOT_TOKEN\s*=\s*["']?([^"'\s]+)["']?/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {
    console.error("Failed to read .dev.vars", e);
  }
  
  if (process.env.DISCORD_BOT_TOKEN) {
    return process.env.DISCORD_BOT_TOKEN;
  }
  
  throw new Error("DISCORD_BOT_TOKEN is not configured in .dev.vars or env.");
}

// 2. Fetch Game State from D1 via wrangler
function getGameState(gameId: string): GameState {
  console.log(`Fetching game state for "${gameId}" from D1...`);
  const cmd = `npx wrangler d1 execute yacht_dice --remote --json --command "SELECT state FROM active_games WHERE id = '${gameId}';"`;
  const output = execSync(cmd, { encoding: "utf-8" });
  const parsed = JSON.parse(output);
  
  if (!parsed || parsed.length === 0 || !parsed[0].results || parsed[0].results.length === 0) {
    throw new Error(`Game session "${gameId}" not found in active_games table.`);
  }
  
  const stateStr = parsed[0].results[0].state;
  return JSON.parse(stateStr) as GameState;
}

// 3. Search Discord Message for Game ID
async function findDiscordMessage(token: string, channelId: string, gameId: string): Promise<string | null> {
  console.log(`Searching for Discord message with Game ID: "${gameId}" in channel: ${channelId}...`);
  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=100`, {
    headers: {
      Authorization: `Bot ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Discord messages: ${response.status} ${await response.text()}`);
  }
  
  const messages = (await response.json()) as any[];
  for (const msg of messages) {
    if (msg.embeds && msg.embeds.length > 0) {
      const footerText = msg.embeds[0].footer?.text || "";
      if (footerText.includes(`Game ID: ${gameId}`)) {
        return msg.id;
      }
    }
  }
  
  return null;
}

// 4. Patch Discord Message
async function patchDiscordMessage(token: string, channelId: string, messageId: string, embedPayload: any) {
  console.log(`Patching Discord message ${messageId} in channel ${channelId}...`);
  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      embeds: embedPayload.embeds,
      components: embedPayload.components || []
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to patch Discord message: ${response.status} ${await response.text()}`);
  }
  
  console.log("Successfully patched Discord message!");
}

async function main() {
  const args = process.argv.slice(2);
  const gameId = args[0];
  const channelId = args[1];

  if (!gameId || !channelId) {
    console.error("Error: gameId and channelId are required.");
    console.error("Usage: npx tsx scripts/patch-finished-game.ts <gameId> <channelId>");
    console.error("Example: npx tsx scripts/patch-finished-game.ts csg4nor 1525161875447480510");
    process.exit(1);
  }
  
  try {
    const token = getBotToken();
    const gameState = getGameState(gameId);
    
    if (gameState.status !== "Finished") {
      console.warn(`Warning: Game state status is "${gameState.status}", not Finished.`);
    }
    
    // Generate final embed payload via our serialization logic
    const program = Effect.gen(function* () {
      const serializer = yield* DiscordResponseSerializer;
      return serializer.serializeGame(gameState);
    }).pipe(Effect.provide(DiscordResponseSerializerLive));
    
    const finalPayload = Effect.runSync(program);
    
    // Find message in the channel
    const messageId = await findDiscordMessage(token, channelId, gameId);
    if (!messageId) {
      console.log(`Could not find a recent Discord message for Game ID: "${gameId}" in channel: ${channelId}.`);
      return;
    }
    
    console.log(`Found Discord Message ID: ${messageId}`);
    
    // Patch message
    await patchDiscordMessage(token, channelId, messageId, finalPayload.data);
    
  } catch (error) {
    console.error("Execution failed:", error);
    process.exit(1);
  }
}

main();
