import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to the fetched files
const matchesFilePath = "C:/Users/bimo/.gemini/antigravity-ide/brain/9781dc2a-732e-43d9-abb6-217bf04a1c04/.system_generated/steps/177/content.md";
const stadiumsFilePath = "C:/Users/bimo/.gemini/antigravity-ide/brain/9781dc2a-732e-43d9-abb6-217bf04a1c04/.system_generated/steps/181/content.md";

// Timezone offsets for June/July 2026 (DST active in USA/Canada, Mexico on standard time)
const timezoneOffsets = {
  "1": "-06:00", // Mexico City (Estadio Azteca)
  "2": "-06:00", // Guadalajara (Estadio Akron)
  "3": "-06:00", // Monterrey (Estadio BBVA)
  "4": "-05:00", // Dallas (AT&T Stadium)
  "5": "-05:00", // Houston (NRG Stadium)
  "6": "-05:00", // Kansas City (GEHA Field)
  "7": "-04:00", // Atlanta (Mercedes-Benz)
  "8": "-04:00", // Miami (Hard Rock)
  "9": "-04:00", // Boston (Gillette)
  "10": "-04:00", // Philadelphia (Lincoln Financial Field)
  "11": "-04:00", // New York (MetLife)
  "12": "-04:00", // Toronto (BMO Field)
  "13": "-07:00", // Vancouver (BC Place)
  "14": "-07:00", // Seattle (Lumen Field)
  "15": "-07:00", // San Francisco (Levi's)
  "16": "-07:00"  // Los Angeles (SoFi)
};

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
  // Try to generate a clean slug
  const h = slugify(home).substring(0, 8);
  const a = slugify(away).substring(0, 8);
  const g = slugify(group);
  return `${h}-${a}-${g}-${id}`;
}

async function run() {
  try {
    // 1. Read and parse stadiums
    const stadiumsContent = fs.readFileSync(stadiumsFilePath, "utf-8");
    const stadiumsJsonStr = stadiumsContent.split("---")[1].trim();
    const stadiumsData = JSON.parse(stadiumsJsonStr);
    
    const stadiumsMap = {};
    stadiumsData.stadiums.forEach(s => {
      stadiumsMap[s.id] = {
        name: s.fifa_name || s.name_en,
        city: s.city_en,
        country: s.country_en
      };
    });

    // 2. Read and parse matches
    const matchesContent = fs.readFileSync(matchesFilePath, "utf-8");
    const matchesJsonStr = matchesContent.split("---")[1].trim();
    const matchesData = JSON.parse(matchesJsonStr);

    console.log(`Parsed ${matchesData.games.length} matches from source.`);

    // 3. Format matches
    const formattedMatches = matchesData.games.map(game => {
      const home = game.home_team_name_en || game.home_team_label || `TBD Home ${game.id}`;
      const away = game.away_team_name_en || game.away_team_label || `TBD Away ${game.id}`;
      
      const stadium = stadiumsMap[game.stadium_id] || { name: `Stadium ${game.stadium_id}`, city: "TBD" };
      const venue = `${stadium.name}, ${stadium.city}`;
      
      const offset = timezoneOffsets[game.stadium_id] || "-05:00";
      
      // Parse local_date: MM/DD/YYYY HH:MM
      const parts = game.local_date.split(" ");
      const dateParts = parts[0].split("/");
      const timeParts = parts[1].split(":");
      const month = dateParts[0];
      const day = dateParts[1];
      const year = dateParts[2];
      const hour = timeParts[0];
      const minute = timeParts[1];
      
      const kickoff = `${year}-${month}-${day}T${hour}:${minute}:00${offset}`;
      
      // Map stages
      let stage = `Group Stage - Group ${game.group}`;
      if (game.group === "R32") stage = "Round of 32";
      if (game.group === "R16") stage = "Round of 16";
      if (game.group === "QF") stage = "Quarter-finals";
      if (game.group === "SF") stage = "Semi-finals";
      if (game.group === "3RD") stage = "Third place play-off";
      if (game.group === "FINAL") stage = "Final";

      const slug = makeSlug(home, away, game.group, game.id);

      return {
        slug,
        home,
        away,
        stage,
        kickoff,
        venue,
        status: "open"
      };
    });

    // 4. Generate SQL script file
    const sqlStatements = [
      "INSERT INTO public.matches (slug, home, away, stage, kickoff, venue, status) VALUES"
    ];
    
    const valueLines = formattedMatches.map(m => {
      const escapedVenue = m.venue.replace(/'/g, "''");
      const escapedHome = m.home.replace(/'/g, "''");
      const escapedAway = m.away.replace(/'/g, "''");
      return `  ('${m.slug}', '${escapedHome}', '${escapedAway}', '${m.stage}', '${m.kickoff}', '${escapedVenue}', '${m.status}')`;
    });
    
    sqlStatements.push(valueLines.join(",\n") + "\nON CONFLICT (slug) DO UPDATE SET");
    sqlStatements.push("  home = EXCLUDED.home,");
    sqlStatements.push("  away = EXCLUDED.away,");
    sqlStatements.push("  stage = EXCLUDED.stage,");
    sqlStatements.push("  kickoff = EXCLUDED.kickoff,");
    sqlStatements.push("  venue = EXCLUDED.venue,");
    sqlStatements.push("  status = EXCLUDED.status;");

    const sqlPath = path.resolve(__dirname, "seed-all-matches.sql");
    fs.writeFileSync(sqlPath, sqlStatements.join("\n"), "utf-8");
    console.log(`SQL seed script generated successfully at: ${sqlPath}`);

    // 5. Try to seed database directly if credentials are provided
    const env = loadEnv();
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      console.log(`Connecting to Supabase at ${url} to execute insert...`);
      const supabase = createClient(url, key);
      
      const { data, error } = await supabase
        .from("matches")
        .upsert(formattedMatches, { onConflict: "slug" })
        .select();

      if (error) {
        console.error("Direct seeding failed:", error.message);
        console.log("Please copy the generated SQL from 'seed-all-matches.sql' and run it in the Supabase Dashboard SQL Editor.");
      } else {
        console.log(`Successfully seeded ${data.length} matches in Supabase database!`);
      }
    } else {
      console.log("No Supabase configuration found in .env.local. Direct insert skipped.");
    }
  } catch (err) {
    console.error("Error during execution:", err);
  }
}

run();
