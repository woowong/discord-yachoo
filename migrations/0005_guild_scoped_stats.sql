-- Add guild_id column to matches
ALTER TABLE matches ADD COLUMN guild_id TEXT;

-- Create guild-scoped player stats table
CREATE TABLE IF NOT EXISTS guild_player_stats (
  player_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  highest_score INTEGER NOT NULL DEFAULT 0,
  solo_play_count INTEGER NOT NULL DEFAULT 0,
  solo_highest_score INTEGER NOT NULL DEFAULT 0,
  multi_wins INTEGER NOT NULL DEFAULT 0,
  multi_losses INTEGER NOT NULL DEFAULT 0,
  multi_draws INTEGER NOT NULL DEFAULT 0,
  multi_highest_score INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (player_id, guild_id)
);

-- Option 1: Clean Slate (All-clear / Reset)
DELETE FROM matches;
DELETE FROM active_games;
DELETE FROM players;
