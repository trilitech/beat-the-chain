// Database types for game results
export type GameResult = {
  id?: number;
  player_name: string;
  score: number;
  lps: number; // letters per second
  accuracy: number;
  rank: string;
  time: number; // in seconds
  ms_per_letter: number;
  game_mode: number; // 15 or 30 words
  isTwitterUser?: boolean; // true if signed in with Twitter, false if name-based
  /** Leaderboard scope: which leaderboard this result belongs to (e.g. "default", "event-feb-2025"). Set via NEXT_PUBLIC_LEADERBOARD_SCOPE. */
  leaderboard_scope?: string;
  created_at?: string;
};

// Leaderboard entry type
export type LeaderboardEntry = {
  id: number;
  player_name: string;
  score: number;
  lps: number;
  accuracy: number;
  rank: string;
  time: number;
  ms_per_letter: number;
  game_mode: number;
  isTwitterUser?: boolean; // true if signed in with Twitter, false if name-based
  leaderboard_scope?: string;
  created_at: string;
};

