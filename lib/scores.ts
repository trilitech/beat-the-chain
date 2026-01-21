import { supabase, supabaseAnonymous } from "./supabase";
import type { GameResult, GameResultSubmission, LeaderboardEntry } from "./types";


/**
 * Get best score from localStorage
 */
export function getLocalBestScore(playerName: string, gameMode: number): number | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `best_score_${playerName}_${gameMode}`;
    const stored = localStorage.getItem(key);
    return stored ? parseFloat(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Save best score to localStorage
 */
export function setLocalBestScore(playerName: string, gameMode: number, score: number): void {
  if (typeof window === "undefined") return;
  try {
    const key = `best_score_${playerName}_${gameMode}`;
    localStorage.setItem(key, score.toString());
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Get the database record ID from localStorage
 */
export function getLocalRecordId(playerName: string, gameMode: number): number | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `record_id_${playerName}_${gameMode}`;
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Save the database record ID to localStorage
 */
export function setLocalRecordId(playerName: string, gameMode: number, id: number): void {
  if (typeof window === "undefined") return;
  try {
    const key = `record_id_${playerName}_${gameMode}`;
    localStorage.setItem(key, id.toString());
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Save a game result to the database only if it's better than existing score
 * Also updates localStorage cache
 * Uses API route with service role key for writes
 */
export async function saveGameResult(result: GameResultSubmission): Promise<{ success: boolean; error?: string; isNewBest?: boolean; id?: number }> {
  try {
    // Call API route which uses service role key for writes
    // Server now computes score and rank, so we don't check localStorage here
    const response = await fetch("/api/game-results", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result),
    });

    const apiResult = await response.json();

    if (!apiResult.success) {
      return { success: false, error: apiResult.error || "Failed to save game result" };
    }

    // Update localStorage cache - fetch from server since score is computed server-side
    const bestScoreResult = await getUserBestScore(
      result.player_name,
      result.game_mode
    );
    if (bestScoreResult.data) {
      setLocalBestScore(result.player_name, result.game_mode, bestScoreResult.data.score);
      if (apiResult.id) {
        setLocalRecordId(result.player_name, result.game_mode, apiResult.id);
      } else if (bestScoreResult.data.id) {
        setLocalRecordId(result.player_name, result.game_mode, bestScoreResult.data.id);
      }
    }

    return {
      success: true,
      isNewBest: apiResult.isNewBest || false,
      id: apiResult.id,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Calculate accuracy-weighted score
 * Uses squared accuracy to give it more weight in the ranking
 */
function calculateAccuracyWeightedScore(lps: number, accuracy: number): number {
  const accuracyDecimal = accuracy / 100;
  return lps * (accuracyDecimal * accuracyDecimal);
}

/**
 * Get leaderboard entries for a specific game mode
 * Sorted by accuracy-weighted score (lps * (accuracy/100)^2)
 * @param gameMode - The game mode (15 or 30 words)
 * @param limit - Number of entries to return (default: 10)
 */
export async function getLeaderboard(
  gameMode: number,
  limit: number = 10
): Promise<{ data: LeaderboardEntry[] | null; error?: string }> {
  try {
    // Note: Leaderboard queries are public reads and don't require authentication
    // Same logic works for name-based and Twitter auth users
    
    let data: any = null;
    let error: any = null;
    
    try {
      // Use anonymous client for public reads - ensures same behavior for all users
      const queryPromise = supabaseAnonymous
        .from("game_results")
        .select("*")
        .eq("game_mode", gameMode)
        .limit(10000);
      
      // Add timeout to prevent hanging (15 seconds to account for slower connections)
      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => {
        setTimeout(() => {
          resolve({ data: null, error: new Error("Database query timeout") });
        }, 15000);
      });
      
      const queryResult = await Promise.race([queryPromise, timeoutPromise]);
      
      if ('data' in queryResult && queryResult.data === null && queryResult.error) {
        // Timeout occurred
        return { data: null, error: queryResult.error.message };
      }
      
      // Query completed (either success or error from Supabase)
      const result = queryResult as { data: any; error: any };
      data = result.data;
      error = result.error;
    } catch (queryErr) {
      return {
        data: null,
        error: queryErr instanceof Error ? queryErr.message : "Unknown error",
      };
    }
    
    if (error) {
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: [] };
    }

    // Sort by stored score (which includes correction bonus and game mode normalization for new entries)
    // Note: Old entries were calculated with the old formula, but will still be sorted correctly
    // Primary sort: stored score (higher is better)
    // Secondary sort: accuracy (higher is better) as tiebreaker
    // Tertiary sort: lps (higher is better) as final tiebreaker
    const sortedEntries = [...data].sort((a: LeaderboardEntry, b: LeaderboardEntry) => {
      // Primary sort: score (higher is better)
      if (Math.abs(b.score - a.score) > 0.0001) {
        return b.score - a.score;
      }
      // Secondary sort: accuracy (higher is better)
      if (Math.abs(b.accuracy - a.accuracy) > 0.01) {
        return b.accuracy - a.accuracy;
      }
      // Tertiary sort: lps (higher is better)
      return b.lps - a.lps;
    });

    // Return top entries
    const topEntries = sortedEntries.slice(0, limit);

    return { data: topEntries as LeaderboardEntry[] };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get user profile data from localStorage
 * Returns the best score across all game modes
 */
export function getUserProfile(playerName: string): {
  name: string;
  bestScore: number | null;
  bestGameMode: number | null;
  hasProfile: boolean;
} {
  if (typeof window === "undefined") {
    return { name: playerName, bestScore: null, bestGameMode: null, hasProfile: false };
  }

  const gameModes = [15, 30];
  let bestScore: number | null = null;
  let bestGameMode: number | null = null;

  for (const mode of gameModes) {
    const score = getLocalBestScore(playerName, mode);
    if (score !== null && (bestScore === null || score > bestScore)) {
      bestScore = score;
      bestGameMode = mode;
    }
  }

  return {
    name: playerName,
    bestScore,
    bestGameMode,
    hasProfile: bestScore !== null,
  };
}

/**
 * Get the user's best score for a specific game mode
 */
export async function getUserBestScore(
  playerName: string,
  gameMode: number
  ): Promise<{ data: LeaderboardEntry | null; error?: string }> {
  try {
    // Note: User score queries are public reads and don't require authentication
    // Same logic works for name-based and Twitter auth users
    
    let data: any = null;
    let error: any = null;
    
    try {
      // Use anonymous client for public reads - ensures same behavior for all users
      const queryPromise = supabaseAnonymous
        .from("game_results")
        .select("*")
        .eq("player_name", playerName)
        .eq("game_mode", gameMode)
        .order("score", { ascending: false })
        .limit(1)
        .single();
      
      // Add timeout to prevent hanging (15 seconds to account for slower connections)
      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) => {
        setTimeout(() => {
          resolve({ data: null, error: new Error("Database query timeout") });
        }, 15000);
      });
      
      const queryResult = await Promise.race([queryPromise, timeoutPromise]);
      
      if ('data' in queryResult && queryResult.data === null && queryResult.error) {
        // Timeout occurred
        return { data: null, error: queryResult.error.message };
      }
      
      // Query completed (either success or error from Supabase)
      const result = queryResult as { data: any; error: any };
      data = result.data;
      error = result.error;
    } catch (queryErr) {
      return {
        data: null,
        error: queryErr instanceof Error ? queryErr.message : "Unknown error",
      };
    }
    
    if (error) {
      // If no record found, that's okay
      if (error.code === "PGRST116") {
        return { data: null };
      }
      return { data: null, error: error.message };
    }

    return { data: data as LeaderboardEntry };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get all best scores for a user across all game modes
 */
export async function getAllUserScores(
  playerName: string
): Promise<{ data: LeaderboardEntry[]; error?: string }> {
  try {
    const gameModes = [15, 30];
    const allScores: LeaderboardEntry[] = [];

    // Fetch best score for each game mode
    // Add error handling to prevent one failed query from blocking others
    for (const mode of gameModes) {
      try {
        const result = await getUserBestScore(playerName, mode);
        if (result.data) {
          allScores.push(result.data);
        }
      } catch (err) {
        // Continue to next mode even if this one failed
      }
    }

    // Sort by game mode (15, 30)
    allScores.sort((a, b) => a.game_mode - b.game_mode);

    return { data: allScores };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Clear all localStorage data for a player
 */
export function clearPlayerData(playerName: string): void {
  if (typeof window === "undefined") return;
  try {
    const gameModes = [15, 30];
    
    // Clear all best scores and record IDs for all game modes
    gameModes.forEach((mode) => {
      localStorage.removeItem(`best_score_${playerName}_${mode}`);
      localStorage.removeItem(`record_id_${playerName}_${mode}`);
    });
    
    // Clear Twitter avatar if exists
    clearStoredTwitterAvatar(playerName);
    
    // Clear the stored player name
    localStorage.removeItem("player_name");
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Get stored player name from localStorage
 */
export function getStoredPlayerName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("player_name");
  } catch {
    return null;
  }
}

/**
 * Store player name in localStorage
 */
export function setStoredPlayerName(playerName: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("player_name", playerName);
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Get stored Twitter avatar URL for a player name
 */
export function getStoredTwitterAvatar(playerName: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `twitter_avatar_${playerName}`;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Store Twitter avatar URL for a player name
 */
export function setStoredTwitterAvatar(playerName: string, avatarUrl: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = `twitter_avatar_${playerName}`;
    localStorage.setItem(key, avatarUrl);
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Clear stored Twitter avatar for a player name
 */
export function clearStoredTwitterAvatar(playerName: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = `twitter_avatar_${playerName}`;
    localStorage.removeItem(key);
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Restore user data from database for a given player name
 * Fetches best scores for all game modes and updates localStorage
 */
export async function restoreUserDataFromDB(playerName: string): Promise<boolean> {
  try {
    const gameModes = [15, 30];
    let hasData = false;

    // Fetch best score for each game mode
    for (const mode of gameModes) {
      const result = await getUserBestScore(playerName, mode);
      if (result.data) {
        // Update localStorage with the fetched data
        setLocalBestScore(playerName, mode, result.data.score);
        setLocalRecordId(playerName, mode, result.data.id);
        hasData = true;
      }
    }

    return hasData;
  } catch (err) {
    return false;
  }
}
