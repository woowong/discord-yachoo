ALTER TABLE players ADD COLUMN solo_play_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN solo_highest_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN multi_wins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN multi_losses INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN multi_draws INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN multi_highest_score INTEGER NOT NULL DEFAULT 0;

UPDATE players SET
  multi_wins = wins,
  multi_losses = losses,
  multi_draws = draws,
  multi_highest_score = highest_score,
  solo_highest_score = highest_score;
