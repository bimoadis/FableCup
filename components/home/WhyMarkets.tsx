"use client";

import { useEffect, useRef } from "react";

export default function WhyMarkets() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const line = svg.querySelector<SVGPathElement>(".marketline");
    if (line) {
      const len = line.getTotalLength();
      line.style.strokeDasharray = String(len);
      line.style.strokeDashoffset = String(len);
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            svg.classList.add("in");
            if (line) {
              line.style.strokeDashoffset = "0";
            }
            io.disconnect();
          }
        });
      },
      { rootMargin: "0px 0px -18% 0px" }
    );
    io.observe(svg);
    return () => io.disconnect();
  }, []);

  return (
    <div className="why-chart reveal">
      <div className="chart-title">
        <span>Probability of &ldquo;Team X reaches the final&rdquo; &middot; stylized week</span>
        <span className="legend">
          <span>
            <i />
            Market probability
          </span>
          <span className="news">
            <i />
            Media narrative
          </span>
        </span>
      </div>

      <svg
        ref={svgRef}
        className="why-svg"
        viewBox="0 0 800 320"
        role="img"
        aria-label="Chart showing market probability rising days before media headlines acknowledge the shift"
      >
        <line className="gridline" x1="60" y1="40" x2="780" y2="40" />
        <line className="gridline" x1="60" y1="110" x2="780" y2="110" />
        <line className="gridline" x1="60" y1="180" x2="780" y2="180" />
        <line className="gridline" x1="60" y1="250" x2="780" y2="250" />
        <text x="20" y="44">60%</text>
        <text x="20" y="114">45%</text>
        <text x="20" y="184">30%</text>
        <text x="20" y="254">15%</text>
        <text x="70" y="290">Mon</text>
        <text x="190" y="290">Tue</text>
        <text x="310" y="290">Wed</text>
        <text x="430" y="290">Thu</text>
        <text x="550" y="290">Fri</text>
        <text x="670" y="290">Sat</text>

        <path
          className="marketline"
          d="M60,240 L130,236 L190,228 L250,196 L310,168 L370,150 L430,118 L490,108 L550,96 L610,88 L670,70 L740,58"
        />

        <path
          className="newsline"
          d="M250,196 L430,118 L670,70"
        />

        <g className="headline" data-h="1">
          <circle className="headline-dot" cx="250" cy="196" r="5" />
          <line x1="250" y1="196" x2="250" y2="150" stroke="#CFC9BB" strokeWidth="1" strokeDasharray="3 3" />
          <text className="headline-label" x="250" y="138" textAnchor="middle">
            Injury rumor, niche forums
          </text>
        </g>
        <g className="headline" data-h="2">
          <circle className="headline-dot" cx="430" cy="118" r="5" />
          <line x1="430" y1="118" x2="430" y2="74" stroke="#CFC9BB" strokeWidth="1" strokeDasharray="3 3" />
          <text className="headline-label" x="430" y="62" textAnchor="middle">
            Beat reporters confirm
          </text>
        </g>
        <g className="headline" data-h="3">
          <circle className="headline-dot" cx="670" cy="70" r="5" />
          <line x1="670" y1="70" x2="670" y2="120" stroke="#CFC9BB" strokeWidth="1" strokeDasharray="3 3" />
          <text className="headline-label" x="670" y="138" textAnchor="middle">
            Front-page headline
          </text>
        </g>
      </svg>

      <div className="why-note">
        <p>
          <b>News headlines are a lagging indicator.</b> Editorial processes
          take hours or days. By the time a narrative reaches the front page,
          the people closest to the information have already priced it in.
        </p>
        <p>
          <b>Market probabilities are a leading indicator.</b> Thousands of
          forecasters, each holding a fragment of knowledge, move the number
          the moment they learn something. The chart above is the pattern,
          repeated every tournament.
        </p>
      </div>
    </div>
  );
}
