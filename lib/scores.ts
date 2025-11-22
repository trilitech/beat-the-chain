import { supabase } from "./supabase";
import type { GameResult, LeaderboardEntry } from "./types";

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
export async function saveGameResult(result: GameResult): Promise<{ success: boolean; error?: string; isNewBest?: boolean; id?: number }> {
  try {
    // Check localStorage first (fast check)
    const localBest = getLocalBestScore(result.player_name, result.game_mode);
    if (localBest !== null && result.score <= localBest) {
      return { success: true, isNewBest: false };
    }

    // Call API route which uses service role key for writes
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

    // Update localStorage cache
    if (apiResult.isNewBest) {
      setLocalBestScore(result.player_name, result.game_mode, result.score);
      if (apiResult.id) {
        setLocalRecordId(result.player_name, result.game_mode, apiResult.id);
      }
    } else {
      // If not a new best, we still want to ensure localStorage is up to date
      // Fetch the current best to update cache
      const bestScoreResult = await getUserBestScore(
        result.player_name,
        result.game_mode
      );
      if (bestScoreResult.data) {
        setLocalBestScore(result.player_name, result.game_mode, bestScoreResult.data.score);
        setLocalRecordId(result.player_name, result.game_mode, bestScoreResult.data.id);
      }
    }

    return {
      success: true,
      isNewBest: apiResult.isNewBest || false,
      id: apiResult.id,
    };
  } catch (err) {
    console.error("Unexpected error saving game result:", err);
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
 * @param gameMode - The game mode (15, 30, or 60 words)
 * @param limit - Number of entries to return (default: 10)
 */
export async function getLeaderboard(
  gameMode: number,
  limit: number = 10
): Promise<{ data: LeaderboardEntry[] | null; error?: string }> {
  try {
    console.log("=== getLeaderboard DEBUG ===");
    console.log("Fetching leaderboard for gameMode:", gameMode, "limit:", limit);
    
    // Check session before query (with timeout to prevent hanging)
    console.log("Checking session...");
    const sessionTimeout = new Promise<{ data: { session: any }, error: any }>((resolve) => 
      setTimeout(() => {
        console.warn("⚠️ Session check timed out after 5 seconds - continuing without session check");
        resolve({ data: { session: null }, error: new Error("Session check timeout") });
      }, 5000)
    );
    
    const sessionCheck = supabase.auth.getSession().catch((err) => {
      console.error("Error getting session:", err);
      return { data: { session: null }, error: err };
    });
    
    // Race between session check and timeout - whichever completes first
    const sessionResult = await Promise.race([sessionCheck, sessionTimeout]);
    const { data: { session } } = sessionResult;
    console.log("Session check completed");
    console.log("Session exists:", !!session);
    console.log("Session user:", session?.user?.id);
    
    // Fetch all entries for this game mode so we can properly sort by accuracy-weighted score
    // Use a high limit to get all entries (Supabase default max is reasonable)
    console.log("Starting database query...");
    const queryStartTime = Date.now();
    const { data, error } = await supabase
      .from("game_results")
      .select("*")
      .eq("game_mode", gameMode)
      .limit(10000); // Fetch a large number to ensure we get all entries for proper sorting
    const queryEndTime = Date.now();
    console.log(`Database query completed in ${queryEndTime - queryStartTime}ms`);

    console.log("Query result - data count:", data?.length || 0);
    console.log("Query result - error:", error);
    
    if (error) {
      console.error("Error fetching leaderboard:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      console.log("==========================");
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      console.log("No leaderboard data found");
      console.log("==========================");
      return { data: [] };
    }

    // Calculate accuracy-weighted score for each entry and sort
    const entriesWithWeightedScore = data.map((entry) => ({
      ...entry,
      weightedScore: calculateAccuracyWeightedScore(entry.lps, entry.accuracy),
    }));

    // Sort by weighted score (descending), then by accuracy (descending) as tiebreaker, then by lps
    entriesWithWeightedScore.sort((a, b) => {
      // Primary sort: weighted score (higher is better)
      if (Math.abs(b.weightedScore - a.weightedScore) > 0.0001) {
        return b.weightedScore - a.weightedScore;
      }
      // Secondary sort: accuracy (higher is better)
      if (Math.abs(b.accuracy - a.accuracy) > 0.01) {
        return b.accuracy - a.accuracy;
      }
      // Tertiary sort: lps (higher is better)
      return b.lps - a.lps;
    });

    // Return top entries (remove the weightedScore property before returning)
    const topEntries = entriesWithWeightedScore.slice(0, limit).map(({ weightedScore, ...entry }) => entry);

    console.log(`Returning ${topEntries.length} top entries`);
    console.log("==========================");
    return { data: topEntries as LeaderboardEntry[] };
  } catch (err) {
    console.error("Unexpected error fetching leaderboard:", err);
    console.error("Error stack:", err instanceof Error ? err.stack : "No stack");
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

  const gameModes = [15, 30, 60];
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
    console.log("=== getUserBestScore DEBUG ===");
    console.log("Querying for playerName:", playerName, "gameMode:", gameMode);
    
    // Check session before query (with timeout to prevent hanging)
    console.log("Checking session...");
    const sessionTimeout = new Promise<{ data: { session: any }, error: any }>((resolve) => 
      setTimeout(() => {
        console.warn("⚠️ Session check timed out after 5 seconds - continuing without session check");
        resolve({ data: { session: null }, error: new Error("Session check timeout") });
      }, 5000)
    );
    
    const sessionCheck = supabase.auth.getSession().catch((err) => {
      console.error("Error getting session:", err);
      return { data: { session: null }, error: err };
    });
    
    // Race between session check and timeout - whichever completes first
    const sessionResult = await Promise.race([sessionCheck, sessionTimeout]);
    const { data: { session } } = sessionResult;
    console.log("Session check completed");
    console.log("Session exists:", !!session);
    console.log("Session user:", session?.user?.id);
    
    console.log("Starting database query...");
    const queryStartTime = Date.now();
    const { data, error } = await supabase
      .from("game_results")
      .select("*")
      .eq("player_name", playerName)
      .eq("game_mode", gameMode)
      .order("score", { ascending: false })
      .limit(1)
      .single();
    const queryEndTime = Date.now();
    console.log(`Database query completed in ${queryEndTime - queryStartTime}ms`);

    console.log("Query result - data:", data);
    console.log("Query result - error:", error);
    
    if (error) {
      // If no record found, that's okay
      if (error.code === "PGRST116") {
        console.log("No record found (PGRST116)");
        console.log("==========================");
        return { data: null };
      }
      console.error("Error fetching user best score:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      console.log("==========================");
      return { data: null, error: error.message };
    }

    console.log("Successfully fetched user best score");
    console.log("==========================");
    return { data: data as LeaderboardEntry };
  } catch (err) {
    console.error("Unexpected error fetching user best score:", err);
    console.error("Error stack:", err instanceof Error ? err.stack : "No stack");
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
    console.log("=== getAllUserScores START ===");
    console.log("Fetching scores for playerName:", playerName);
    
    // Check session before query
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Session exists:", !!session);
    console.log("Session user:", session?.user?.id);
    
    const gameModes = [15, 30, 60];
    const allScores: LeaderboardEntry[] = [];

    // Fetch best score for each game mode
    for (const mode of gameModes) {
      console.log(`Fetching scores for mode ${mode}...`);
      const result = await getUserBestScore(playerName, mode);
      if (result.data) {
        console.log(`Found score for mode ${mode}:`, result.data.score);
        allScores.push(result.data);
      } else if (result.error) {
        console.error(`Error fetching mode ${mode}:`, result.error);
      } else {
        console.log(`No score found for mode ${mode}`);
      }
    }

    // Sort by game mode (15, 30, 60)
    allScores.sort((a, b) => a.game_mode - b.game_mode);

    console.log(`Total scores found: ${allScores.length}`);
    console.log("=== getAllUserScores END ===");
    return { data: allScores };
  } catch (err) {
    console.error("Unexpected error fetching all user scores:", err);
    console.error("Error stack:", err instanceof Error ? err.stack : "No stack");
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
    const gameModes = [15, 30, 60];
    
    // Clear all best scores and record IDs for all game modes
    gameModes.forEach((mode) => {
      localStorage.removeItem(`best_score_${playerName}_${mode}`);
      localStorage.removeItem(`record_id_${playerName}_${mode}`);
    });
    
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
 * Get stored Twitter user data from localStorage
 */
export function getStoredTwitterUser(): { handle: string; avatarUrl?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("twitter_user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Store Twitter user data in localStorage
 */
export function setStoredTwitterUser(handle: string, avatarUrl?: string): void {
  if (typeof window === "undefined") return;
  try {
    const userData = { handle, avatarUrl };
    localStorage.setItem("twitter_user", JSON.stringify(userData));
    localStorage.setItem("is_twitter_auth", "true");
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Clear stored Twitter user data from localStorage
 */
export function clearStoredTwitterUser(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("twitter_user");
    localStorage.setItem("is_twitter_auth", "false");
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
    const gameModes = [15, 30, 60];
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
    console.error("Error restoring user data from database:", err);
    return false;
  }
}

