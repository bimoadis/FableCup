# Fable Cup · Developer Brief

Read this once, fully, before touching the code. It covers what the product is, how to run and deploy it, the database schema, the manual operations runbook for the tournament, and the design rules that must not be broken.

---

## 1. What this is

Fable Cup is a prediction platform for World Cup 2026, positioned as a **collective intelligence / prediction market product**, in the visual language of Stripe, Linear, Polymarket, and the Financial Times.

It is explicitly **not** presented as a crypto project, sportsbook, or gambling product. This affects copy, design, and even error messages.

**Language rules. These are product requirements, not style preferences:**

| Never write | Write instead |
|---|---|
| bet, wager, stake | forecast, prediction, submit |
| odds, payout | probability, reward |
| win money, jackpot | earn rewards for accuracy |
| gamble, punt | participate, join a market |

Reason: positioning and regulatory surface. Prediction platforms with accuracy rewards sit in a gray zone in many jurisdictions. Skill-based, no-stake framing is deliberate. Keep it that way in every string you add.

---

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript | React 19 |
| Styling | Custom design-system CSS in `app/globals.css` + Tailwind v4 available | The design system is hand-written CSS by intent; Tailwind is wired up for new utility needs |
| Motion | GSAP ScrollTrigger (hero only) + IntersectionObserver + CSS transitions (everything else) | Keeps the bundle small |
| Fonts | next/font: Fraunces, Instrument Sans, IBM Plex Mono | Self-hosted by Next at build time |
| Database | Supabase (Postgres) | Free tier is sufficient for launch |
| Wallet | Phantom injected provider, no adapter library | See section 7 |
| Hosting | Vercel free tier | |

## 3. Structure

```
fable-cup/
  app/
    layout.tsx            Root layout: fonts, Nav, Footer, Fx (global reveal)
    globals.css           The entire design system. Read it before adding CSS.
    page.tsx              Homepage (9 sections)
    markets/
      page.tsx            Markets list (server component, reads lib/markets.ts)
      [slug]/page.tsx     Market detail: outcomes + prediction form + rules
  components/
    Nav.tsx  Footer.tsx   Static chrome
    Fx.tsx                Global IntersectionObserver for .reveal elements
    home/
      Hero.tsx            GSAP pinned narrative (the signature element)
      MarketBoard.tsx     Outright board: sparkline draw + probability drift
      WhyMarkets.tsx      Market-vs-headlines chart
      Tokenomics.tsx      Allocation bar + table
    market/
      Outcomes.tsx        1X2 probability bars
      PredictionPanel.tsx Phantom connect + score form + Supabase insert
  lib/
    markets.ts            SAMPLE fixture data. Replace with Supabase reads.
    supabase.ts           Client + submitPrediction(). Demo mode if env empty.
    wallet.ts             Minimal Phantom connector
  .env.example
```

## 4. Run locally

```
npm install
cp .env.example .env.local
npm run dev
```

Without Supabase credentials the site runs in **demo mode**: the prediction form works end to end but persists nothing, and the panel is labeled "Demo mode". This is intentional so the frontend can be reviewed before backend setup.

## 5. Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (Settings &gt; API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_MIN_FABLE` | Display-only minimum $FABLE balance string |

The anon key is safe to expose; security comes from Row Level Security (next section). Never put the `service_role` key in any `NEXT_PUBLIC_` variable.

## 6. Supabase setup

Create a project at supabase.com, then run this in the SQL editor:

```sql
create table public.matches (
  slug        text primary key,
  home        text not null,
  away        text not null,
  stage       text,
  kickoff     timestamptz,
  venue       text,
  status      text not null default 'open'  -- open | locked | settled
);

create table public.predictions (
  id          uuid primary key default gen_random_uuid(),
  wallet      text not null,
  match_slug  text not null references public.matches(slug),
  home_score  int  not null check (home_score between 0 and 20),
  away_score  int  not null check (away_score between 0 and 20),
  created_at  timestamptz not null default now(),
  unique (wallet, match_slug)
);

create table public.results (
  match_slug  text primary key references public.matches(slug),
  home_score  int not null,
  away_score  int not null,
  settled_at  timestamptz not null default now()
);

create table public.airdrop_log (
  id            uuid primary key default gen_random_uuid(),
  wallet        text not null,
  match_slug    text not null references public.matches(slug),
  amount        numeric not null,
  tx_signature  text,
  sent_at       timestamptz not null default now()
);

-- Row Level Security
alter table public.matches      enable row level security;
alter table public.predictions  enable row level security;
alter table public.results      enable row level security;
alter table public.airdrop_log  enable row level security;

create policy "public read matches"     on public.matches     for select using (true);
create policy "public read results"     on public.results     for select using (true);
create policy "public read airdrops"    on public.airdrop_log for select using (true);
create policy "public read predictions" on public.predictions for select using (true);

-- Inserts allowed only while the match is open
create policy "insert while open" on public.predictions
  for insert with check (
    exists (
      select 1 from public.matches m
      where m.slug = match_slug and m.status = 'open'
    )
  );
```

No update or delete policies exist on `predictions`: forecasts are immutable by design. Writes to `matches`, `results`, and `airdrop_log` happen only through the Supabase dashboard or a server-side script using the `service_role` key.

**Known MVP gap, accept it consciously:** the wallet address is client-supplied and not signature-verified, so someone could submit on behalf of an address they do not own. Acceptable at launch because submitting for someone else only ever helps that wallet. Fix before rewards get large: have the user sign a message (`signMessage` in Phantom) containing `match_slug + scores` and verify the signature in a Supabase Edge Function before insert.

## 7. Wallet notes

`lib/wallet.ts` talks to the Phantom injected provider directly (`window.solana`). No `@solana/wallet-adapter` dependency: smaller bundle, zero config, good enough for one wallet.

Upgrade path when you want multi-wallet support (Solflare, Backpack): swap `lib/wallet.ts` internals for `@solana/wallet-adapter-react` and keep the same `connectPhantom`-shaped interface so components do not change.

Checking the user's $FABLE balance client-side: use `@solana/web3.js` `getParsedTokenAccountsByOwner` against a public RPC, filtered by the $FABLE mint address (you will have this after the pump.fun launch). For settlement, balance checks should run server-side against the export of wallets, not in the browser.

## 8. Wiring real data

`lib/markets.ts` is sample data so the site works out of the box. To go live:

1. Insert real fixtures into the `matches` table.
2. In `app/markets/page.tsx` and `app/markets/[slug]/page.tsx`, replace the `matchMarkets` / `getMarket` imports with Supabase queries (these are server components, so query directly with the anon client and add `export const revalidate = 60`).
3. Probabilities: at MVP, compute implied probability from the distribution of submitted predictions per market (a simple SQL `group by` on predicted winner) and display that. Do not call it odds.

## 9. Manual operations runbook (per match day)

This is the human loop the platform runs on until automation exists.

1. **Before kickoff.** In the Supabase table editor, set the match row `status = 'locked'`. The RLS policy then rejects new predictions automatically.
2. **After full time.** Insert the official result into `results`, set match `status = 'settled'`.
3. **Compute winners.** Exact score:

```sql
select p.wallet
from public.predictions p
join public.results r using (match_slug)
where p.match_slug = 'bra-mar-group'
  and p.home_score = r.home_score
  and p.away_score = r.away_score;
```

Correct winner only (leaderboard points), compare `sign(p.home_score - p.away_score)` with `sign(r.home_score - r.away_score)`.

4. **Verify balances.** Check each winning wallet still holds the minimum $FABLE (script with web3.js, or manually for small lists).
5. **Send rewards.** For small lists, send from Phantom directly. For larger lists use a bulk sender (Squads or Streamflow both work on Solana). Record every transfer in `airdrop_log` with the transaction signature.
6. **Publish.** Post the winner list and transaction signatures publicly. Transparency is the trust model while operations are manual.

## 10. Deploy to Vercel

1. Push this folder to a GitHub repository.
2. vercel.com &gt; Add New Project &gt; import the repo. Next.js is auto-detected; defaults are correct.
3. Add the three environment variables under Project &gt; Settings &gt; Environment Variables.
4. Deploy. The free tier handles launch traffic; the homepage is static-generated and market pages are prebuilt via `generateStaticParams`.

Custom domain later: add it in Vercel &gt; Domains and point DNS. Until then the `*.vercel.app` URL is fine.

## 11. Design rules (do not break these)

The design system lives entirely in `app/globals.css` and is the product's identity.

- Background is warm paper `#F8F6F2`. There is no dark mode. Do not add one.
- Color is restricted to the tokens in `:root`. Green `#1E6B4E` means probability up / live / leading. Red `#A8392E` means probability down / error. Nothing else uses them.
- Type: Fraunces for display, Instrument Sans for body, IBM Plex Mono with `tabular-nums` for every number that can change. Numbers must never cause layout shift.
- No neon, no glows, no gradients, no rounded cards, no emoji, no casino or rocket imagery. Hairline borders (`--rule`) and sharp corners only.
- Motion: GSAP is reserved for the hero. Everything else is IntersectionObserver plus CSS transitions. Honor `prefers-reduced-motion`; the override block at the bottom of globals.css must keep working for anything you add.
- New interactive elements need visible `:focus-visible` styles (already global).

## 12. TODO after launch

- [ ] Signature-verified submissions (section 6 gap)
- [ ] Replace sample data with Supabase reads + revalidation
- [ ] "My forecasts" view (query predictions by connected wallet)
- [ ] Leaderboard page (points table from settled results)
- [ ] $FABLE balance check at submission time
- [ ] Bulk reward automation (Squads/Streamflow)
- [ ] OG image per market (`opengraph-image.tsx`)
- [ ] Analytics (Vercel Analytics is one click and free)

## 13. Compliance posture

The product avoids stake-based mechanics: submitting a forecast costs nothing and risks nothing; rewards come from a pre-funded community pool based on accuracy. Keep that true in code. If any future feature requires users to lock or risk tokens against an outcome, stop and get a legal review first, because that changes the product's regulatory category in most jurisdictions.

FIFA trademarks: the site says "World Cup 2026" descriptively and states non-affiliation in the footer. Do not use FIFA logos, official marks, or tournament branding assets anywhere.
