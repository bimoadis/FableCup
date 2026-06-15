import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to matches file
const matchesFilePath = "C:/Users/bimo/.gemini/antigravity-ide/brain/9781dc2a-732e-43d9-abb6-217bf04a1c04/.system_generated/steps/177/content.md";

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

function slugify(text) {
  return text.toLowerCase()
    .replace(/runner-up/g, "ru")
    .replace(/winner/g, "w")
    .replace(/group/g, "gp")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeSlug(home, away, group, id) {
  const h = slugify(home).substring(0, 8);
  const a = slugify(away).substring(0, 8);
  const g = slugify(group);
  return `${h}-${a}-${g}-${id}`;
}

async function run() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  try {
    // 1. Read matches JSON
    const matchesContent = fs.readFileSync(matchesFilePath, "utf-8");
    const matchesJsonStr = matchesContent.split("---")[1].trim();
    const matchesData = JSON.parse(matchesJsonStr);

    // 2. Filter matches that are finished
    const finishedMatches = matchesData.games.filter(
      (game) => game.finished === "TRUE" || game.finished === true
    );

    console.log(`Found ${finishedMatches.length} finished matches in source data.`);

    const resultsToInsert = [];
    const matchSlugsToSettle = [];

    finishedMatches.forEach((game) => {
      const home = game.home_team_name_en || game.home_team_label;
      const away = game.away_team_name_en || game.away_team_label;
      
      const slug = makeSlug(home, away, game.group, game.id);
      
      const homeScore = parseInt(game.home_score, 10);
      const awayScore = parseInt(game.away_score, 10);

      if (!Number.isNaN(homeScore) && !Number.isNaN(awayScore)) {
        resultsToInsert.push({
          match_slug: slug,
          home_score: homeScore,
          away_score: awayScore,
          settled_at: new Date().toISOString()
        });
        matchSlugsToSettle.push(slug);
      }
    });

    if (resultsToInsert.length === 0) {
      console.log("No valid scores to insert.");
      return;
    }

    console.log(`Inserting ${resultsToInsert.length} results into Supabase...`);
    
    // 3. Insert into public.results
    const { data: insertedResults, error: resultsError } = await supabase
      .from("results")
      .upsert(resultsToInsert, { onConflict: "match_slug" })
      .select();

    if (resultsError) {
      console.error("Failed to insert results:", resultsError.message);
      process.exit(1);
    }

    console.log(`Successfully stored ${insertedResults.length} match results!`);

    // 4. Update match statuses to 'settled'
    console.log("Updating match statuses to 'settled'...");
    const { error: matchUpdateError } = await supabase
      .from("matches")
      .update({ status: "settled" })
      .in("slug", matchSlugsToSettle);

    if (matchUpdateError) {
      console.error("Failed to update matches status:", matchUpdateError.message);
      process.exit(1);
    }

    console.log("Successfully set matches status to 'settled' for finished games!");
  } catch (err) {
    console.error("Error running results seed:", err);
  }
}

run();
