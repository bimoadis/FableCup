import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const cronSecret = env.CRON_SECRET || "";
const port = process.env.PORT || 3000;
const baseUrl = `http://localhost:${port}`;

async function triggerCron(endpoint) {
  const url = `${baseUrl}/api/cron/${endpoint}`;
  console.log(`Triggering cron endpoint: ${url}`);
  
  const headers = {};
  if (cronSecret) {
    headers["Authorization"] = `Bearer ${cronSecret}`;
  }

  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    console.log(`Response status: ${res.status}`);
    console.log("Response data:", JSON.stringify(data, null, 2));
    return { ok: res.ok, data };
  } catch (err) {
    console.error(`Error triggering ${endpoint}:`, err.message);
    return { ok: false, error: err.message };
  }
}

async function run() {
  console.log("=== Testing Cron Endpoints ===");
  console.log("Triggering auto-lock...");
  await triggerCron("auto-lock");
  
  console.log("\nTriggering auto-settle...");
  await triggerCron("auto-settle");
  console.log("=============================");
}

run();
