import Link from "next/link";

export default function Nav() {
  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-inner">
        <Link href="/" className="wordmark">
          Anthropic <em>Cup</em>
        </Link>
        <div className="nav-links">
          <Link href="/#idea">The idea</Link>
          <Link href="/markets">Markets</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/#token">$ANTHROPIC</Link>
          <Link href="/#roadmap">Roadmap</Link>
        </div>
        <Link href="/markets" className="btn">
          <span>Enter the market</span>
          <span className="tick">&#9650; 18%</span>
        </Link>
      </div>
    </nav>
  );
}
