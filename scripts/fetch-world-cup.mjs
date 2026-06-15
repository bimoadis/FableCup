import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchQuery(query) {
  const url = `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(query)}`;
  console.log(`Fetching from: ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`HTTP error for query "${query}": ${res.status}`);
      return [];
    }
    const data = await res.json();
    const markets = [];
    if (data.events && Array.isArray(data.events)) {
      data.events.forEach(event => {
        if (event.markets && Array.isArray(event.markets)) {
          event.markets.forEach(m => {
            // Include event metadata on the market object for completeness
            markets.push({
              ...m,
              eventTitle: event.title,
              eventSlug: event.slug,
              eventDescription: event.description,
              eventActive: event.active,
              eventClosed: event.closed
            });
          });
        }
      });
    }
    return markets;
  } catch (err) {
    console.error(`Error fetching query "${query}":`, err.message);
    return [];
  }
}

async function main() {
  console.log("=== Fetching Polymarket FIFA World Cup 2026 Markets ===");
  
  // Fetch from multiple relevant query terms to ensure we get both active and inactive/closed matches
  const queries = [
    "FIFA World Cup",
    "World Cup 2026",
    "World Cup"
  ];
  
  const allMarkets = [];
  const seenIds = new Set();
  
  for (const query of queries) {
    const markets = await fetchQuery(query);
    markets.forEach(m => {
      if (!seenIds.has(m.id)) {
        seenIds.add(m.id);
        allMarkets.push(m);
      }
    });
  }
  
  console.log(`Fetched ${allMarkets.length} unique markets.`);
  
  // Format outcomes and outcomePrices from JSON strings to native arrays/objects if they are strings
  const formattedMarkets = allMarkets.map(m => {
    let outcomes = m.outcomes;
    if (typeof outcomes === "string") {
      try { outcomes = JSON.parse(outcomes); } catch(e) {}
    }
    let outcomePrices = m.outcomePrices;
    if (typeof outcomePrices === "string") {
      try { outcomePrices = JSON.parse(outcomePrices); } catch(e) {}
    }
    let clobTokenIds = m.clobTokenIds;
    if (typeof clobTokenIds === "string") {
      try { clobTokenIds = JSON.parse(clobTokenIds); } catch(e) {}
    }
    
    return {
      ...m,
      outcomes,
      outcomePrices,
      clobTokenIds
    };
  });

  const outputPath = path.resolve(__dirname, "../getFromGamma.json");
  fs.writeFileSync(outputPath, JSON.stringify(formattedMarkets, null, 2), "utf-8");
  console.log(`Successfully wrote ${formattedMarkets.length} markets to: ${outputPath}`);
}

main();
