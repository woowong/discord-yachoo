-- Add elo column to players table
ALTER TABLE players ADD COLUMN elo INTEGER NOT NULL DEFAULT 1000;

-- Add elo column to guild_player_stats table
ALTER TABLE guild_player_stats ADD COLUMN elo INTEGER NOT NULL DEFAULT 1000;
