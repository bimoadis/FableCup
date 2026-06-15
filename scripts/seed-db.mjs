import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to parse .env.local file
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

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use service role key if available, otherwise fallback to anon key (which requires RLS insert policies if enabled)
const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

console.log("Connecting to Supabase:", url);
const supabase = createClient(url, key);

const initialMatches = [
  {
    slug: "bra-mar-group",
    home: "Brazil",
    away: "Morocco",
    stage: "Group stage · Matchday 2",
    kickoff: "2026-06-14T20:00:00-04:00", // Sun 14 Jun · 20:00 ET
    venue: "MetLife Stadium, New Jersey",
    status: "open",
  },
  {
    slug: "arg-den-group",
    home: "Argentina",
    away: "Denmark",
    stage: "Group stage · Matchday 2",
    kickoff: "2026-06-15T18:00:00-05:00", // Mon 15 Jun · 18:00 CT
    venue: "AT&T Stadium, Dallas",
    status: "open",
  },
  {
    slug: "eng-sen-group",
    home: "England",
    away: "Senegal",
    stage: "Group stage · Matchday 2",
    kickoff: "2026-06-16T17:00:00-07:00", // Tue 16 Jun · 17:00 PT
    venue: "SoFi Stadium, Los Angeles",
    status: "open",
  },
  {
    slug: "fra-jpn-group",
    home: "France",
    away: "Japan",
    stage: "Group stage · Matchday 2",
    kickoff: "2026-06-16T19:00:00-04:00", // Tue 16 Jun · 19:00 ET
    venue: "Estadio Azteca, Mexico City",
    status: "open",
  },
  {
    slug: "esp-usa-group",
    home: "Spain",
    away: "United States",
    stage: "Group stage · Matchday 2",
    kickoff: "2026-06-17T16:00:00-04:00", // Wed 17 Jun · 16:00 ET
    venue: "Mercedes-Benz Stadium, Atlanta",
    status: "open",
  },
  {
    slug: "ger-nga-group",
    home: "Germany",
    away: "Nigeria",
    stage: "Group stage · Matchday 2",
    kickoff: "2026-06-17T19:00:00-04:00", // Wed 17 Jun · 19:00 ET
    venue: "BMO Field, Toronto",
    status: "open",
  },
];

async function seed() {
  console.log("Seeding matches table...");
  const { data, error } = await supabase
    .from("matches")
    .upsert(initialMatches, { onConflict: "slug" })
    .select();

  if (error) {
    console.error("Error seeding matches:", error.message);
    console.error("Details:", error.details || error.hint || "");
    console.log("\nIf this is permission error (due to Row Level Security), try adding SUPABASE_SERVICE_ROLE_KEY in .env.local or run this SQL in Supabase dashboard SQL Editor:\n");
    console.log(generateSQL());
    process.exit(1);
  }

  console.log(`Successfully seeded ${data.length} matches!`);
}

function generateSQL() {
  return `INSERT INTO public.matches (slug, home, away, stage, kickoff, venue, status) VALUES
${initialMatches.map(m => `  ('${m.slug}', '${m.home}', '${m.away}', '${m.stage}', '${m.kickoff}', '${m.venue}', '${m.status}')`).join(",\n")}
ON CONFLICT (slug) DO UPDATE SET
  home = EXCLUDED.home,
  away = EXCLUDED.away,
  stage = EXCLUDED.stage,
  kickoff = EXCLUDED.kickoff,
  venue = EXCLUDED.venue,
  status = EXCLUDED.status;`;
}

seed();
