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
  created_at?: string;
};

export type StartRunRequest = {
  player_name: string;
  game_mode: number;
};

export type StartRunResponse = {
  run_id: string;
  token: string;
  expires_at: number;
};

export type GameResultSubmission = {
  run_id: string;
  token: string;
  player_name: string;
  game_mode: number;
  lps: number;
  accuracy: number;
  time: number;
  ms_per_letter: number;
  total_letters: number;
  uncorrected_errors: number;
  corrected_errors: number;
  isTwitterUser?: boolean;
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
  created_at: string;
};

