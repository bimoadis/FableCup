"use client";

import { useEffect, useRef } from "react";
import type { MatchMarket } from "@/lib/markets";
import { supabase } from "@/lib/supabase";

export default function Outcomes({ market }: { market: MatchMarket }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("in");
            io.disconnect();
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const rows = [
    { name: `${market.home} win`, p: market.probs.home },
    { name: "Draw", p: market.probs.draw },
    { name: `${market.away} win`, p: market.probs.away },
  ];
  const max = Math.max(...rows.map((r) => r.p));

  return (
    <div className="outcomes" ref={ref} aria-label="Current market probabilities">
      <div className="board-head">
        <span>Implied probability &middot; full time</span>
        <span className="mono">{supabase ? "Live" : "Sample data"}</span>
      </div>
      {rows.map((r) => (
        <div className={`outcome-row${r.p === max ? " lead" : ""}`} key={r.name}>
          <div className="outcome-top">
            <span className="o-name">{r.name}</span>
            <span className="o-prob">{r.p}%</span>
          </div>
          <div className="outcome-bar">
            <i style={{ ["--w" as string]: r.p + "%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
