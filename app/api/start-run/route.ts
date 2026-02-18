import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase";
import type { StartRunRequest, StartRunResponse } from "../../../lib/types";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body: StartRunRequest = await request.json();

    if (!body.player_name || body.game_mode === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const nameRegex = /^[a-zA-Z0-9._-]{3,50}$/;
    if (!nameRegex.test(body.player_name)) {
      return NextResponse.json(
        { success: false, error: "Invalid player name format" },
        { status: 400 }
      );
    }

    if (![15, 30].includes(body.game_mode)) {
      return NextResponse.json(
        { success: false, error: "Invalid game mode" },
        { status: 400 }
      );
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 30 * 1000);

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("game_runs")
      .insert([
        {
          token_hash: tokenHash,
          issued_at: issuedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          ip: ip,
          user_agent: userAgent,
          game_mode: body.game_mode,
          player_name: body.player_name,
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error("Error creating game run:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const response: StartRunResponse = {
      run_id: data.id,
      token: token,
      expires_at: Math.floor(expiresAt.getTime() / 1000),
    };

    return NextResponse.json({ success: true, ...response });
  } catch (err) {
    console.error("Unexpected error creating game run:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
