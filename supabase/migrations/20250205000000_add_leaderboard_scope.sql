-- Add leaderboard_scope to game_results so the same app can show different leaderboards per deployment.
-- Set NEXT_PUBLIC_LEADERBOARD_SCOPE in the deployment (e.g. "event-feb-2025") to show a separate board.
-- Rows with NULL scope are treated as "default" for backward compatibility.

ALTER TABLE game_results
ADD COLUMN IF NOT EXISTS leaderboard_scope text DEFAULT 'default';

-- Optional: backfill existing rows so they appear on the "default" leaderboard explicitly.
-- UPDATE game_results SET leaderboard_scope = 'default' WHERE leaderboard_scope IS NULL;

-- Index for leaderboard queries filtered by game_mode and scope
CREATE INDEX IF NOT EXISTS idx_game_results_leaderboard
ON game_results (game_mode, leaderboard_scope, score DESC);
