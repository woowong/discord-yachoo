const commands = [
  {
    name: "challenge",
    description: "Start a Yacht Dice game",
    options: [
      {
        name: "opponent",
        description: "Choose an opponent to challenge",
        type: 6, // USER type
        required: false
      }
    ]
  },
  {
    name: "profile",
    description: "View your Yacht Dice stats"
  },
  {
    name: "leaderboard",
    description: "View the Yacht Dice leaderboard"
  },
  {
    name: "history",
    description: "View recent match history and turn records",
    options: [
      {
        name: "game_id",
        description: "Specific Game ID to view detailed turn-by-turn history",
        type: 3, // STRING
        required: false
      }
    ]
  }
];

async function registerCommands() {
  const appId = process.env.DISCORD_APP_ID;
  const token = process.env.DISCORD_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!appId || !token) {
    console.error("Error: DISCORD_APP_ID and DISCORD_TOKEN environment variables are required.");
    console.error("Usage: DISCORD_APP_ID=xxx DISCORD_TOKEN=xxx [DISCORD_GUILD_ID=xxx] npx tsx scripts/register-commands.ts");
    process.exit(1);
  }

  const url = guildId
    ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${appId}/commands`;

  console.log(`Registering commands to: ${url}`);

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${token}`
      },
      body: JSON.stringify(commands)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
    }

    const data = await response.json();
    console.log("Success! Registered commands:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Failed to register commands:", error);
    process.exit(1);
  }
}

registerCommands();
