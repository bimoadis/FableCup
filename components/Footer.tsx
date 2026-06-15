import Link from "next/link";

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <span className="wordmark" style={{ fontSize: 16 }}>
            Anthropic <em>Cup</em>
          </span>
          <div className="foot-links">
            <Link href="/#idea">Thesis</Link>
            <Link href="/markets">Markets</Link>
            <Link href="/#tokenomics">Allocation</Link>
            <Link href="/#roadmap">Roadmap</Link>
          </div>
          <span className="mono">&copy; 2026 Anthropic Cup</span>
        </div>
        <p className="disclaimer">
          Anthropic Cup is a skill-based forecasting platform. Probabilities shown
          on this site are illustrative until live markets open. Anthropic Cup is
          not affiliated with FIFA. $ANTHROPIC is a utility token used for platform
          access, governance, and rewards; nothing on this site is financial
          advice or an offer of securities.
        </p>
      </div>
    </footer>
  );
}
