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

export async function submitPrediction(
  p: PredictionInput
): Promise<SubmitResult> {
  if (!supabase) {
    await new Promise((r) => setTimeout(r, 600)); // simulate latency
    return { ok: true, demo: true };
  }

  // Request signature from Phantom wallet
  const { signPhantomMessage } = await import("./wallet");
  const messageStr = `Anthropic Cup Prediction: ${p.match_slug} - ${p.home_score}:${p.away_score}`;
  const signRes = await signPhantomMessage(messageStr);
  if (!signRes.ok) {
    return { ok: false, error: signRes.error };
  }

  try {
    const response = await fetch("/api/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...p,
        signature: signRes.signature,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      return { ok: false, error: data.error || "Failed to submit prediction" };
    }

    return { ok: true, demo: data.demo };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

