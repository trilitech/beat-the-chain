import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase";
import type { GameResultSubmission } from "../../../lib/types";
import { calculateScore, calculateRank } from "../../../lib/server-scoring";
import crypto from "crypto";
import { isNameValid } from "../../../lib/name-validation";

export async function POST(request: NextRequest) {
  try {
    const body: GameResultSubmission = await request.json();

    if (
      !body.run_id ||
      !body.token ||
      !body.player_name ||
      body.game_mode === undefined
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const nameValidation = isNameValid(body.player_name);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { success: false, error: nameValidation.error },
        { status: 400 }
      );
    }

    if (![15, 30].includes(body.game_mode)) {
      return NextResponse.json(
        { success: false, error: "Invalid game mode" },
        { status: 400 }
      );
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(body.token)
      .digest("hex");

    const supabase = getSupabaseServerClient();

    const { data: run, error: runError } = await supabase
      .from("game_runs")
      .select("*")
      .eq("id", body.run_id)
      .eq("token_hash", tokenHash)
      .single();

    if (runError || !run) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired run session" },
        { status: 400 }
      );
    }

    if (new Date(run.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "Run session expired" },
        { status: 400 }
      );
    }

    if (run.used_at) {
      return NextResponse.json(
        { success: false, error: "Run session already used" },
        { status: 400 }
      );
    }

    const timeSinceIssue = Date.now() - new Date(run.issued_at).getTime();
    if (timeSinceIssue < 2000) {
      return NextResponse.json(
        { success: false, error: "Game completed too quickly" },
        { status: 400 }
      );
    }

    await supabase
      .from("game_runs")
      .update({ used_at: new Date().toISOString() })
      .eq("id", body.run_id);

    if (body.lps <= 0) {
      return NextResponse.json(
        { success: false, error: "LPS must be greater than 0" },
        { status: 400 }
      );
    }

    if (body.lps > 60) {
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

    const minTimeForMode = body.game_mode === 30 ? 3.0 : 1.5;
    if (body.time < minTimeForMode) {
      return NextResponse.json(
        {
          success: false,
          error: `Time too short for ${body.game_mode}-word mode. Minimum: ${minTimeForMode}s`,
        },
        { status: 400 }
      );
    }

    const maxTimeForMode = body.game_mode === 30 ? 300 : 120;
    if (body.time > maxTimeForMode) {
      return NextResponse.json(
        {
          success: false,
          error: `Time too long for ${body.game_mode}-word mode. Maximum: ${maxTimeForMode}s`,
        },
        { status: 400 }
      );
    }

    if (body.ms_per_letter < 0 || body.ms_per_letter > 1000000) {
      return NextResponse.json(
        { success: false, error: "ms_per_letter out of valid range" },
        { status: 400 }
      );
    }

    const expectedMsPerLetter = 1000 / body.lps;
    const msDifference = Math.abs(body.ms_per_letter - expectedMsPerLetter);
    if (msDifference > 5) {
      return NextResponse.json(
        { success: false, error: "ms_per_letter calculation mismatch" },
        { status: 400 }
      );
    }

    const totalErrors = body.uncorrected_errors + body.corrected_errors;
    const calculatedScore = calculateScore(
      body.lps,
      body.accuracy,
      body.game_mode,
      totalErrors,
      body.corrected_errors,
      body.total_letters
    );

    if (calculatedScore < 0 || calculatedScore > 20) {
      return NextResponse.json(
        { success: false, error: "Score out of valid range" },
        { status: 400 }
      );
    }

    const calculatedRank = calculateRank(calculatedScore, body.accuracy);

    const { data: existingRecords, error: queryError } = await supabase
      .from("game_results")
      .select("id, score")
      .eq("player_name", body.player_name)
      .eq("game_mode", body.game_mode)
      .order("score", { ascending: false })
      .limit(1);

    if (queryError && queryError.code !== "PGRST116") {
      console.error("Error checking existing record:", queryError);
    }

    const existingRecord =
      existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

    if (existingRecord && calculatedScore > existingRecord.score) {
      const { data, error } = await supabase
        .from("game_results")
        .update({
          score: calculatedScore,
          lps: body.lps,
          accuracy: body.accuracy,
          rank: calculatedRank,
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
    } else if (existingRecord && calculatedScore <= existingRecord.score) {
      return NextResponse.json({
        success: true,
        isNewBest: false,
        id: existingRecord.id,
      });
    } else {
      const { data, error } = await supabase
        .from("game_results")
        .insert([
          {
            player_name: body.player_name,
            score: calculatedScore,
            lps: body.lps,
            accuracy: body.accuracy,
            rank: calculatedRank,
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
