import type { Metadata } from "next";
import Link from "next/link";
import { getLiveMatchMarkets } from "@/lib/markets";

export const metadata: Metadata = {
  title: "Markets · Anthropic Cup",
  description:
    "Open prediction markets for World Cup 2026 fixtures. Submit your forecast and watch collective probability evolve.",
};

export default async function MarketsPage() {
  const matches = await getLiveMatchMarkets();

  return (
    <main>
      <div className="page-head wrap">
        <span className="eyebrow">Open markets</span>
        <h2 style={{ margin: "20px 0 14px" }}>This week&rsquo;s questions.</h2>
        <p className="lede">
          Every fixture is a market. Pick the one you hold a view on, submit
          your forecast, and watch the collective probability evolve up to
          kickoff.
        </p>
      </div>

      <div className="wrap" style={{ paddingBottom: "clamp(80px,11vw,150px)" }}>
        <div className="mlist-grid">
          {matches.map((m) => (

            <Link href={`/markets/${m.slug}`} className="mcard" key={m.slug}>
              <span className="stage">
                <span>{m.stage}</span>
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
            </Link>
          ))}
        </div>
        <p
          className="mono"
          style={{
            marginTop: 18,
            fontSize: 12,
            color: "var(--ink-faint)",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>Fixtures and probabilities shown are sample data</span>
          <span>More markets open after each match day</span>
        </p>
      </div>
    </main>
  );
}
