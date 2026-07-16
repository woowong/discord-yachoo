-- Add post-match Elo ratings to matches table for history tracking
ALTER TABLE matches ADD COLUMN player1_elo_after INTEGER;
ALTER TABLE matches ADD COLUMN player2_elo_after INTEGER;
