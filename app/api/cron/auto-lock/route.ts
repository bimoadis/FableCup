import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const cronSecret = process.env.CRON_SECRET;

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })
  : null;

export async function GET(request: Request) {
  // 1. Validate Cron Secret (Vercel Cron security check)
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  }

  try {
    const now = new Date().toISOString();

    // 2. Query matches that should be locked
    const { data: matchesToLock, error: selectError } = await supabaseAdmin
      .from("matches")
      .select("slug, kickoff, status")
      .eq("status", "open")
      .lte("kickoff", now);

    if (selectError) {
      return NextResponse.json({ ok: false, error: selectError.message }, { status: 500 });
    }

    if (!matchesToLock || matchesToLock.length === 0) {
      return NextResponse.json({ ok: true, message: "No matches to lock." });
    }

    const slugsToLock = matchesToLock.map((m) => m.slug);

    // 3. Update status of the matched slugs to 'locked'
    const { error: updateError } = await supabaseAdmin
      .from("matches")
      .update({ status: "locked" })
      .in("slug", slugsToLock);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    console.log(`Successfully locked matches: ${slugsToLock.join(", ")}`);
    return NextResponse.json({ ok: true, locked: slugsToLock });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
