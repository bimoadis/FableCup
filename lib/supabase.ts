import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Null when env vars are missing: the app then runs in demo mode. */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;

export type PredictionInput = {
  wallet: string;
  match_slug: string;
  home_score: number;
  away_score: number;
};

export type SubmitResult =
  | { ok: true; demo: boolean }
  | { ok: false; error: string };

/**
 * Insert a prediction. One prediction per wallet per match is enforced
 * by a unique constraint in the database (see DEVELOPER-BRIEF.md).
 * Without Supabase credentials this is a no-op demo that always succeeds.
 */
export async function submitPrediction(
  p: PredictionInput
): Promise<SubmitResult> {
  if (!supabase) {
    await new Promise((r) => setTimeout(r, 600)); // simulate latency
    return { ok: true, demo: true };
  }
  const { error } = await supabase.from("predictions").insert(p);
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "This wallet has already submitted a forecast for this match.",
      };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, demo: false };
}
