"use client";

import { useState } from "react";
import type { MatchMarket } from "@/lib/markets";
import { connectPhantom, shortAddress } from "@/lib/wallet";
import { submitPrediction, supabase } from "@/lib/supabase";

const MIN_ANTHROPIC = process.env.NEXT_PUBLIC_MIN_ANTHROPIC || "1,000";

type Status =
  | { kind: "idle" }
  | { kind: "busy"; msg: string }
  | { kind: "ok"; msg: string }
  | { kind: "err"; msg: string };

export default function PredictionPanel({ market }: { market: MatchMarket }) {
  const [wallet, setWallet] = useState<string | null>(null);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleConnect() {
    setStatus({ kind: "busy", msg: "Waiting for Phantom\u2026" });
    const res = await connectPhantom();
    if (res.ok) {
      setWallet(res.address);
      setStatus({ kind: "idle" });
    } else {
      setStatus({ kind: "err", msg: res.error });
    }
  }

  async function handleSubmit() {
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (!wallet) {
      setStatus({ kind: "err", msg: "Connect your Phantom wallet first." });
      return;
    }
    if (Number.isNaN(h) || Number.isNaN(a) || h < 0 || a < 0 || h > 20 || a > 20) {
      setStatus({ kind: "err", msg: "Enter a score between 0 and 20 for each side." });
      return;
    }
    setStatus({ kind: "busy", msg: "Recording your forecast\u2026" });
    const res = await submitPrediction({
      wallet,
      match_slug: market.slug,
      home_score: h,
      away_score: a,
    });
    if (res.ok) {
      setStatus({
        kind: "ok",
        msg: res.demo
          ? `Forecast recorded (demo mode): ${market.home} ${h}, ${market.away} ${a}. Connect Supabase to persist submissions.`
          : `Forecast recorded: ${market.home} ${h}, ${market.away} ${a}. Good luck.`,
      });
    } else {
      setStatus({ kind: "err", msg: res.error });
    }
  }

  const busy = status.kind === "busy";

  return (
    <div className="predict-panel">
      <div className="panel-label">
        <span>Your forecast</span>
        <span>{supabase ? "Live" : "Demo mode"}</span>
      </div>
      <h3>Call the score.</h3>
      <p className="hint">
        One forecast per wallet. Locks at kickoff, settles against the
        official full-time result. Holding {MIN_ANTHROPIC} $ANTHROPIC is required to
        participate.
      </p>

      <div className="score-row">
        <div className="score-cell">
          <label htmlFor="home-score">{market.home}</label>
          <input
            id="home-score"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder="0"
            value={home}
            onChange={(e) => setHome(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <span className="score-sep">v</span>
        <div className="score-cell">
          <label htmlFor="away-score">{market.away}</label>
          <input
            id="away-score"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder="0"
            value={away}
            onChange={(e) => setAway(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      </div>

      <div className="wallet-row">
        <span className={`wallet-pill${wallet ? " on" : ""}`}>
          <i />
          {wallet ? shortAddress(wallet) : "No wallet connected"}
        </span>
        {!wallet && (
          <button className="btn ghost" onClick={handleConnect} disabled={busy}>
            Connect Phantom
          </button>
        )}
      </div>

      <button
        className="btn"
        style={{ width: "100%", justifyContent: "center" }}
        onClick={handleSubmit}
        disabled={busy || status.kind === "ok"}
      >
        {busy ? status.msg : status.kind === "ok" ? "Forecast submitted" : "Submit forecast"}
      </button>

      {status.kind === "ok" && <p className="status-msg ok">{status.msg}</p>}
      {status.kind === "err" && <p className="status-msg err">{status.msg}</p>}

      <p className="fine">
        Forecasting on Anthropic Cup is a test of judgment, not a wager. There is
        no fee to submit and nothing is staked; rewards come from the
        community pool and are earned by accuracy alone.
      </p>
    </div>
  );
}
