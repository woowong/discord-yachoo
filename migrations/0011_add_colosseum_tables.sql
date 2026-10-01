CREATE TABLE IF NOT EXISTS colosseum_matches (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT,
  persona_a_id TEXT NOT NULL,
  persona_b_id TEXT NOT NULL,
  odds_a REAL NOT NULL,
  odds_b REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'BETTING',
  winner TEXT,
  score_a INTEGER,
  score_b INTEGER,
  timeline_json TEXT,
  created_at INTEGER NOT NULL,
  closed_at INTEGER
);

CREATE TABLE IF NOT EXISTS colosseum_bets (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  chosen_persona TEXT NOT NULL,
  amount INTEGER NOT NULL,
  odds REAL NOT NULL,
  payout INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at INTEGER NOT NULL,
  UNIQUE(match_id, user_id)
);
