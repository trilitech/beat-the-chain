import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase";
import type { GameResult } from "../../../lib/types";

const ALLOWED_RANKS = [
  "Grandmaster of Speed 👑",
  "Turbo Typelord 💎",
  "Chain Slayer ⚔️",
  "Speed Operator 🥇",
  "Latency Warrior 🥈",
  "Typing Rookie 🥉",
];

export async function POST(request: NextRequest) {
  try {
    const body: GameResult = await request.json();
    
    // Validate required fields
    if (!body.player_name || body.score === undefined || body.game_mode === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate rank (must be one of the allowed ranks)
    if (!body.rank || !ALLOWED_RANKS.includes(body.rank)) {
      return NextResponse.json(
        { success: false, error: "Invalid rank" },
        { status: 400 }
      );
    }

    // Validate player name (3-50 characters, alphanumeric, dots, hyphens, underscores only)
    const nameRegex = /^[a-zA-Z0-9._-]{3,50}$/;
    if (!nameRegex.test(body.player_name)) {
      return NextResponse.json(
        { success: false, error: "Invalid player name format" },
        { status: 400 }
      );
    }

    // Validate game mode (must be 15 or 30)
    if (![15, 30].includes(body.game_mode)) {
      return NextResponse.json(
        { success: false, error: "Invalid game mode" },
        { status: 400 }
      );
    }

    // Validate numeric values are reasonable
    if (body.score < 0 || body.score > 10000) {
      return NextResponse.json(
        { success: false, error: "Score out of valid range" },
        { status: 400 }
      );
    }

    if (body.lps < 0 || body.lps > 100) {
      return NextResponse.json(
        { success: false, error: "LPS out of valid range" },
        { status: 400 }
      );
    }

    if (body.accuracy < 0 || body.accuracy > 100) {
      return NextResponse.json(
        { success: false, error: "Accuracy out of valid range" },
        { status: 400 }
      );
    }

    if (body.ms_per_letter < 0 || body.ms_per_letter > 1000000) {
      return NextResponse.json(
        { success: false, error: "ms_per_letter out of valid range" },
        { status: 400 }
      );
    }

    // Validate consistency: score should be reasonable based on lps and accuracy
    // Formula includes:
    // - Base score: lps * (accuracy/100)^2
    // - Correction bonus: up to 15%
    // - Game mode multiplier: 22% for 30-word mode
    // - No scaling factor (score directly reflects weighted LPS)
    // Maximum possible: baseScore * 1.15 * 1.22 ≈ baseScore * 1.40
    // Calculate base score: lps * (accuracy/100)^2
    const baseScore = body.lps * Math.pow(body.accuracy / 100, 2);
    // Allow up to 1.5x the base score to account for correction bonus and game mode multiplier
    const maxAllowedScore = baseScore * 1.5;
    const minAllowedScore = baseScore * 0.9; // Allow rounding differences
    
    if (body.score > maxAllowedScore || body.score < minAllowedScore) {
      return NextResponse.json(
        { success: false, error: "Score calculation mismatch" },
        { status: 400 }
      );
    }

    // Validate consistency: ms_per_letter should approximately equal 1000 / lps
    // Allow small differences (within 10ms)
    const expectedMsPerLetter = 1000 / body.lps;
    const msDifference = Math.abs(body.ms_per_letter - expectedMsPerLetter);
    if (msDifference > 10) {
      return NextResponse.json(
        { success: false, error: "ms_per_letter calculation mismatch" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    
    // Check if we have an existing record by player_name and game_mode
    const { data: existingRecords, error: queryError } = await supabase
      .from("game_results")
      .select("id, score")
      .eq("player_name", body.player_name)
      .eq("game_mode", body.game_mode)
      .order("score", { ascending: false })
      .limit(1);

    // Handle query errors (but continue if no record found)
    if (queryError && queryError.code !== "PGRST116") {
      console.error("Error checking existing record:", queryError);
      // Continue anyway - might be first score
    }

    const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

    if (existingRecord && body.score > existingRecord.score) {
      // Update existing record with better score
      const { data, error } = await supabase
        .from("game_results")
        .update({
          score: body.score,
          lps: body.lps,
          accuracy: body.accuracy,
          rank: body.rank,
          time: body.time,
          ms_per_letter: body.ms_per_letter,
          isTwitterUser: body.isTwitterUser ?? false,
        })
        .eq("id", existingRecord.id)
        .select();

      if (error) {
        console.error("Error updating game result:", error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        isNewBest: true,
        id: data && data[0] ? data[0].id : existingRecord.id,
      });
    } else if (existingRecord && body.score <= existingRecord.score) {
      // Score not better - don't update
      return NextResponse.json({
        success: true,
        isNewBest: false,
        id: existingRecord.id,
      });
    } else {
      // No existing record - insert new one
      const { data, error } = await supabase
        .from("game_results")
        .insert([
          {
            player_name: body.player_name,
            score: body.score,
            lps: body.lps,
            accuracy: body.accuracy,
            rank: body.rank,
            time: body.time,
            ms_per_letter: body.ms_per_letter,
            game_mode: body.game_mode,
            isTwitterUser: body.isTwitterUser ?? false,
          },
        ])
        .select();

      if (error) {
        console.error("Error saving game result:", error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        isNewBest: true,
        id: data && data[0] ? data[0].id : undefined,
      });
    }
  } catch (err) {
    console.error("Unexpected error saving game result:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

