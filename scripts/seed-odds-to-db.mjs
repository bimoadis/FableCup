import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load env variables from .env.local
function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.substring(0, idx).trim();
    const val = trimmed.substring(idx + 1).trim();
    env[key] = val;
  });
  return env;
}

// Normalize team names for robust matching
function normalizeTeamName(name) {
  if (!name) return "";
  let norm = name.toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/islands/g, "")
    .replace(/island/g, "")
    .replace(/and/g, "") // removes 'and' for Bosnia and Herzegovina -> bosniaherzegovina
    .trim();
  
  if (norm === "czechrepublic" || norm === "czechrepublic") norm = "czechia";
  if (norm === "bosniaherzegovina") norm = "bosniaherzegovina";
  
  return norm;
}

async function main() {
  console.log("=== Seeding Polymarket/Ultras Odds to Supabase Database ===");
  
  // 1. Load odds.json
  const oddsPath = path.resolve(__dirname, "../odds.json");
  if (!fs.existsSync(oddsPath)) {
    console.error(`Error: odds.json not found at ${oddsPath}`);
    process.exit(1);
  }
  const oddsData = JSON.parse(fs.readFileSync(oddsPath, "utf-8"));
  console.log(`Loaded ${oddsData.length} matches from odds.json`);

  // 2. Initialize Supabase Client
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Error: Supabase credentials not found in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  // 3. Fetch matches from database
  console.log("Fetching matches from Supabase...");
  const { data: dbMatches, error: dbError } = await supabase
    .from("matches")
    .select("slug, home, away");

  if (dbError || !dbMatches) {
    console.error("Failed to fetch matches from DB:", dbError?.message);
    process.exit(1);
  }
  console.log(`Fetched ${dbMatches.length} matches from DB.`);

  // 4. Match and update
  let updatedCount = 0;
  let skippedCount = 0;

  for (const dbMatch of dbMatches) {
    const dbHomeNorm = normalizeTeamName(dbMatch.home);
    const dbAwayNorm = normalizeTeamName(dbMatch.away);

    // Find matching fixture in odds.json
    const matchOdds = oddsData.find(item => {
      const itemHomeNorm = normalizeTeamName(item.home_team);
      const itemAwayNorm = normalizeTeamName(item.away_team);
      return (
        (dbHomeNorm === itemHomeNorm && dbAwayNorm === itemAwayNorm) ||
        (dbHomeNorm === itemAwayNorm && dbAwayNorm === itemHomeNorm)
      );
    });

    if (matchOdds && matchOdds.odds) {
      const away_win = parseInt(matchOdds.odds.away_win);
      const draw = parseInt(matchOdds.odds.draw);
      const home_win = parseInt(matchOdds.odds.home_win);

      console.log(`Matching: "${dbMatch.home} vs ${dbMatch.away}" -> Home: ${home_win}%, Draw: ${draw}%, Away: ${away_win}%`);

      const { error: updateError } = await supabase
        .from("matches")
        .update({
          away_win,
          draw,
          home_win
        })
        .eq("slug", dbMatch.slug);

      if (updateError) {
        console.error(`Failed to update ${dbMatch.slug}:`, updateError.message);
      } else {
        updatedCount++;
      }
    } else {
      console.log(`[DEFAULT ODDS] Setting defaults for "${dbMatch.home} vs ${dbMatch.away}" -> Home: 34%, Draw: 29%, Away: 27%`);
      
      const { error: updateError } = await supabase
        .from("matches")
        .update({
          away_win: 27,
          draw: 29,
          home_win: 34
        })
        .eq("slug", dbMatch.slug);

      if (updateError) {
        console.error(`Failed to update default odds for ${dbMatch.slug}:`, updateError.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`\n=== Seeding Finished ===`);
  console.log(`Successfully updated: ${updatedCount} matches`);
  console.log(`Skipped: ${skippedCount} matches`);
}

main();
