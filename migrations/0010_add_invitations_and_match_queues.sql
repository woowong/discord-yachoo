CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  challenger_id TEXT NOT NULL,
  challenger_name TEXT NOT NULL,
  opponent_id TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS match_queues (
  id TEXT PRIMARY KEY,
  host_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'WAITING',
  created_at INTEGER NOT NULL
);
