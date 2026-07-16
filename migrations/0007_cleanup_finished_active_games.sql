-- Cleanup finished games from active_games table to optimize database storage
DELETE FROM active_games
WHERE json_extract(state, '$.status') = 'Finished';
