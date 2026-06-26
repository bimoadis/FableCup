"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { connectPhantom, disconnectPhantom, shortAddress } from "@/lib/wallet";
import type { MatchMarket } from "@/lib/markets";

export default function MarketList({ initialMatches }: { initialMatches: MatchMarket[] }) {
  // Default filter is set to "today" as requested
  const [filter, setFilter] = useState<"today" | "week" | "all" | "your_forecast">("today");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [wallet, setWallet] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, { home_score: number; away_score: number }>>({});
  const [isFetching, setIsFetching] = useState(false);

  const fetchPredictions = async (addr: string) => {
    setIsFetching(true);
    try {
      const res = await fetch(`/api/predictions?wallet=${addr}`);
      const data = await res.json();
      if (data.ok && data.data) {
        const predMap: Record<string, { home_score: number; away_score: number }> = {};
        data.data.forEach((p: any) => {
          predMap[p.match_slug] = { home_score: p.home_score, away_score: p.away_score };
        });
        setPredictions(predMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    const session = localStorage.getItem("phantomWalletSession");
    if (session) {
      try {
        const { address, expiresAt } = JSON.parse(session);
        if (Date.now() < expiresAt) {
          setWallet(address);
          fetchPredictions(address);
        } else {
          localStorage.removeItem("phantomWalletSession");
        }
      } catch (e) {
        localStorage.removeItem("phantomWalletSession");
      }
    }
  }, []);

  useEffect(() => {
    if (!wallet) return;
    
    const sessionStr = localStorage.getItem("phantomWalletSession");
    if (sessionStr) {
      try {
        const { expiresAt } = JSON.parse(sessionStr);
        const timeRemaining = expiresAt - Date.now();
        if (timeRemaining > 0) {
          const timer = setTimeout(() => {
            disconnectPhantom();
            setWallet(null);
            setPredictions({});
            localStorage.removeItem("phantomWalletSession");
            alert("Your wallet session has expired after 10 minutes.");
          }, timeRemaining);
          return () => clearTimeout(timer);
        } else {
          disconnectPhantom();
          setWallet(null);
          setPredictions({});
          localStorage.removeItem("phantomWalletSession");
        }
      } catch (e) {}
    }
  }, [wallet]);

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  const stages = [
    { label: "Group Stage", value: "GROUP_STAGE" },
    { label: "Round of 32", value: "LAST_32" },
    { label: "Round of 16", value: "LAST_16" },
    { label: "Quarter-finals", value: "QUARTER_FINALS" },
    { label: "Semi-finals", value: "SEMI_FINALS" },
    { label: "Third-place", value: "THIRD_PLACE" },
    { label: "Final", value: "FINAL" }
  ];

  const filteredMatches = initialMatches.filter((m) => {
    // 1. Exclude undetermined knockout slots
    const isDetermined = (name: string) => {
      const lower = name.toLowerCase();
      return !lower.includes("winner") &&
        !lower.includes("runner") &&
        !lower.includes("loser") &&
        !lower.includes("tbd");
    };

    if (!isDetermined(m.home) || !isDetermined(m.away)) {
      return false;
    }

    // 3. Stage Filter
    if (groupFilter !== "all") {
      const matchStageUpper = (m.round || "").toUpperCase();
      if (matchStageUpper !== groupFilter) return false;
    }

    // 4. Time Filter
    if (filter === "your_forecast") {
      return !!predictions[m.slug];
    }

    if (filter === "all") return true;

    if (!m.rawKickoff) return false;
    const matchDate = new Date(m.rawKickoff);
    const matchTime = matchDate.getTime();
    const diffDays = (matchTime - startOfToday) / oneDay;

    if (filter === "today") {
      // Same calendar day
      return (
        matchDate.getFullYear() === today.getFullYear() &&
        matchDate.getMonth() === today.getMonth() &&
        matchDate.getDate() === today.getDate()
      );
    }

    if (filter === "week") {
      // From today up to next 7 days
      return diffDays >= 0 && diffDays < 7;
    }

    return true;
  });

  const sortedMatches = [...filteredMatches].sort((a, b) => {
    if (a.status === "open" && b.status !== "open") return -1;
    if (a.status !== "open" && b.status === "open") return 1;
    return 0;
  });

  return (
    <div>
      {/* Primary Time Filter Tabs */}
      <div className="filter-tabs" style={{
        display: "flex",
        gap: "24px",
        marginBottom: "20px",
        borderBottom: "1px solid var(--rule)",
        paddingBottom: "8px"
      }}>
        <button
          onClick={() => setFilter("today")}
          style={{
            background: "none",
            border: "none",
            fontFamily: "var(--mono)",
            fontSize: "13px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            color: filter === "today" ? "var(--ink)" : "var(--ink-faint)",
            borderBottom: filter === "today" ? "2px solid var(--ink)" : "2px solid transparent",
            paddingBottom: "8px",
            marginBottom: "-10px",
            fontWeight: filter === "today" ? "600" : "400",
            transition: "all 0.15s ease"
          }}
        >
          Today
        </button>
        <button
          onClick={() => setFilter("week")}
          style={{
            background: "none",
            border: "none",
            fontFamily: "var(--mono)",
            fontSize: "13px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            color: filter === "week" ? "var(--ink)" : "var(--ink-faint)",
            borderBottom: filter === "week" ? "2px solid var(--ink)" : "2px solid transparent",
            paddingBottom: "8px",
            marginBottom: "-10px",
            fontWeight: filter === "week" ? "600" : "400",
            transition: "all 0.15s ease"
          }}
        >
          This Week
        </button>
        <button
          onClick={() => setFilter("all")}
          style={{
            background: "none",
            border: "none",
            fontFamily: "var(--mono)",
            fontSize: "13px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            color: filter === "all" ? "var(--ink)" : "var(--ink-faint)",
            borderBottom: filter === "all" ? "2px solid var(--ink)" : "2px solid transparent",
            paddingBottom: "8px",
            marginBottom: "-10px",
            fontWeight: filter === "all" ? "600" : "400",
            transition: "all 0.15s ease"
          }}
        >
          All
        </button>
        <button
          onClick={() => {
            setFilter("your_forecast");
            if (wallet && Object.keys(predictions).length === 0) {
              fetchPredictions(wallet);
            }
          }}
          style={{
            background: "none",
            border: "none",
            fontFamily: "var(--mono)",
            fontSize: "13px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            color: filter === "your_forecast" ? "var(--ink)" : "var(--ink-faint)",
            borderBottom: filter === "your_forecast" ? "2px solid var(--ink)" : "2px solid transparent",
            paddingBottom: "8px",
            marginBottom: "-10px",
            fontWeight: filter === "your_forecast" ? "600" : "400",
            transition: "all 0.15s ease"
          }}
        >
          {isFetching && filter === "your_forecast" ? "Loading..." : "Your Forecast"}
        </button>
      </div>



      {/* Secondary Group Filter Pills */}
      <div className="group-pills" style={{
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
        marginBottom: "36px"
      }}>
        <button
          onClick={() => setGroupFilter("all")}
          style={{
            background: groupFilter === "all" ? "var(--ink)" : "transparent",
            color: groupFilter === "all" ? "var(--paper)" : "var(--ink-soft)",
            border: `1px solid ${groupFilter === "all" ? "var(--ink)" : "var(--rule-dark)"}`,
            borderRadius: "2px",
            fontFamily: "var(--mono)",
            fontSize: "11px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "5px 12px",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          All Matches
        </button>
        {stages.map((k) => (
          <button
            key={k.value}
            onClick={() => setGroupFilter(k.value)}
            style={{
              background: groupFilter === k.value ? "var(--ink)" : "transparent",
              color: groupFilter === k.value ? "var(--paper)" : "var(--ink-soft)",
              border: `1px solid ${groupFilter === k.value ? "var(--ink)" : "var(--rule-dark)"}`,
              borderRadius: "2px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "5px 12px",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            {k.label}
          </button>
        ))}
      </div>

      {filter === "your_forecast" && (
        <div style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--paper-raised)", padding: "16px 20px", border: "1px solid var(--rule-dark)", borderRadius: "4px" }}>
          <div>
            <h3 style={{ margin: "0 0 4px 0", fontFamily: "var(--sans)", fontSize: "16px", color: "var(--ink)", fontWeight: 600 }}>Your Forecasts</h3>
            <p style={{ margin: 0, fontFamily: "var(--sans)", fontSize: "13px", color: "var(--ink-soft)" }}>
              {wallet ? `Connected as ${shortAddress(wallet)}` : "Connect your Phantom wallet to view your predictions."}
            </p>
          </div>
          <div>
            {!wallet ? (
              <button
                onClick={async () => {
                  const res = await connectPhantom();
                  if (res.ok) {
                    setWallet(res.address);
                    fetchPredictions(res.address);
                    localStorage.setItem("phantomWalletSession", JSON.stringify({
                      address: res.address,
                      expiresAt: Date.now() + 10 * 60 * 1000
                    }));
                  } else {
                    alert(res.error || "Failed to connect wallet");
                  }
                }}
                style={{
                  background: "var(--ink)",
                  color: "var(--paper)",
                  border: "none",
                  padding: "8px 16px",
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  borderRadius: "2px",
                  letterSpacing: "0.05em",
                  transition: "opacity 0.2s"
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = "0.8")}
                onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Connect Wallet
              </button>
            ) : (
              <button
                onClick={async () => {
                  await disconnectPhantom();
                  setWallet(null);
                  setPredictions({});
                  localStorage.removeItem("phantomWalletSession");
                }}
                style={{
                  background: "transparent",
                  color: "var(--ink)",
                  border: "1px solid var(--rule)",
                  padding: "8px 16px",
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  borderRadius: "2px",
                  letterSpacing: "0.05em",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "var(--ink)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "var(--rule)";
                }}
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}

      {filter === "your_forecast" && !wallet ? null : sortedMatches.length === 0 ? (
        <div style={{
          padding: "60px 0",
          textAlign: "center",
          fontFamily: "var(--sans)",
          color: "var(--ink-soft)",
          border: "1px dashed var(--rule-dark)",
          background: "var(--paper-raised)"
        }}>
          No matches scheduled for this selection.
        </div>
      ) : (
        <div className="mlist-grid">
          {sortedMatches.map((m) => (
            <Link href={`/markets/${m.slug}`} className="mcard" key={m.slug}>
              <span className="stage">
                <span>{m.round}</span>
                <span>{m.status === "open" ? "Open" : m.status}</span>
              </span>
              <p className="teams">
                {m.home} <em>v</em> {m.away}
              </p>
              <p className="meta">
                {m.kickoff} &middot; {m.venue}
              </p>
              <div className="probs mono">
                <span>
                  {m.home.split(" ")[0]}
                  <b>{m.probs.home}%</b>
                </span>
                <span>
                  Draw<b>{m.probs.draw}%</b>
                </span>
                <span>
                  {m.away.split(" ")[0]}
                  <b>{m.probs.away}%</b>
                </span>
              </div>
              {predictions[m.slug] && (
                <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed var(--rule)", fontSize: "12px", color: "var(--ink)", fontFamily: "var(--mono)" }}>
                  <b>YOUR FORECAST:</b> {m.home.split(" ")[0]} {predictions[m.slug].home_score} - {predictions[m.slug].away_score} {m.away.split(" ")[0]}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
