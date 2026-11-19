# Macro Intelligence — additive plan (extends existing fundamentals)

## What exists today (inspected)
- Signals page `src/routes/_authenticated/signals.tsx` has a "news" tab rendering `FundamentalEvents` (USD high-impact calendar, grouped outlook, XAU bias).
- `src/lib/fundamental-news.ts`: ShowMyTrades calendar fetch (called from the browser), XAU intraday/daily fetch (xaus.com), rule-based `classifyEvent` / `buildFundamentalOutlook` / `analyseXauMarket`. Covered by `src/lib/fundamental-news.test.ts`.
- `src/routes/api/public/fundamental-history.ts`: 10-minute sync lock, upserts into `fundamental_event_history`, returns last 500 rows. Called by `.github/workflows/fundamental-news-ci.yml` every 15 min.
- Tables `fundamental_event_history` (actual/forecast/previous as text, no revised, no MoM/YoY) and `fundamental_sync_state` (single row lock).
- Nav: Overview / Robot / Signals tabs + settings menu (Account). Secrets available: `LOVABLE_API_KEY`, `LOVABLE_CRON_SECRET` only.

## Pre-existing issues to fix along the way
- The history endpoint is public, uses the admin client and anyone can trigger a sync. Plan: keep the GET read-only, move syncing to a managed scheduled job authenticated with `authenticateCronRequest` (keep the GitHub workflow URL working during transition, then retire it).

## Feature design
1. **Macro tab inside Signals** (no new bottom tab): rename the "news" tab to "Macro". Sections: Upcoming / Recent releases, Event detail, Saved analyses.
2. **Event detail route** `src/routes/_authenticated/macro.$eventId.tsx`: actual, forecast, previous, revised, MoM, YoY, surprise vs forecast; each value shows source + published/retrieved time, or an explicit "Not available" chip.
3. **Context interpretation**: AI-written explanation (Lovable AI) grounded ONLY in stored source records; flags revisions, collection gaps (e.g. shutdown), methodology notes, and why the metric matters. Any claim without a stored source is dropped; output lists citations.
4. **Market scenarios** for XAUUSD, NAS100, US30, USD: bullish case, bearish case, drivers, "may already be priced in" caveat, invalidation condition. Fixed wording: "Scenario, not a trade instruction." No link to robot controls or EA commands.
5. **Saved / recent analyses**: per-user save list; recent = last generated analyses (shared cache).

## Data providers
| Purpose | Provider | Access | Status |
|---|---|---|---|
| Calendar (existing) | ShowMyTrades public API | none | in use |
| Jobs, CPI, PPI, revisions | BLS Public Data API v2 | free key `BLS_API_KEY` | **needed from you** (works keyless at low limits) |
| Fed rates & series, MoM/YoY base | FRED (St. Louis Fed) | free key `FRED_API_KEY` | **needed from you** |
| GDP, PCE | BEA API | free key `BEA_API_KEY` | **needed from you** |
| Treasury yields/fiscal | Treasury Fiscal Data API | none | available |
| Fed statements/press | federalreserve.gov RSS | none | available |
| Reputable financial reporting | none connected | — | **unavailable** — optional: Firecrawl connector search (headlines/links only, respecting site terms) |
| ThriveInMarkets | no public API known | — | **unavailable** — shown only if you have a permitted feed/API; never scraped |
| NAS100 / US30 prices | none in project | — | **unavailable** — scenarios will be qualitative until a price source is chosen |
| Interpretation | Lovable AI (existing `LOVABLE_API_KEY`) | billed per request | available |

Unavailable sources are labelled "Not checked" in the UI, never implied.

## Backend
- `src/lib/macro/providers/{bls,fred,bea,treasury,fedrss}.server.ts`: fetch + normalize to `{series, period, value, revised_value, release_time, source_url, retrieved_at}`; timeouts, 429 backoff, per-provider error state.
- `src/lib/macro/compute.ts` (browser-safe, pure): MoM/YoY, surprise, revision delta, source-conflict detection (values differing beyond tolerance → "Sources disagree", both shown).
- `src/lib/macro/analysis.server.ts`: Lovable AI Responses call with strict JSON schema (claims[] each with source_id), streamed server-side; refusals/402/429 handled per gateway rules, cached result reused.
- `src/lib/macro.functions.ts`: `getMacroEvent`, `getEventAnalysis` (cache-first, generate if stale), `saveAnalysis`, `listSaved` — all `requireSupabaseAuth`.
- `src/routes/api/public/jobs/macro-sync.ts`: scheduled (every 15 min) with `authenticateCronRequest`; pulls official series for events released in last 48h, records stale/failed provider state.

## Database (one additive migration, nothing dropped)
- `macro_source_observations`: event_id, provider, series_id, period, value, revised_value, mom, yoy, source_url, published_at, retrieved_at, status. Read: authenticated; write: service role.
- `macro_event_analysis`: event_id, version, context jsonb, scenarios jsonb, citations jsonb, model, generated_at, stale_after. Read: authenticated.
- `macro_saved_analyses`: user_id, analysis_id, created_at. Owner-only RLS.
- `macro_provider_status`: provider, last_ok_at, last_error, rate_limited_until (service role only).
- Optional nullable `revised_value` column on `fundamental_event_history`.
- All with GRANTs + RLS. Existing tables, trigger and EA tables untouched.

## Untouched
Login, dashboard, robot controls, trading modes, themes, `ea-checkin` contract, robot_commands, trading_accounts, MQL side.

## Tests
- `src/lib/macro/compute.test.ts`: MoM/YoY math, missing data → "unavailable", revision delta, conflict detection threshold.
- Provider normalizer tests with recorded fixture payloads (BLS/FRED/BEA/Treasury), incl. error/429/empty.
- Analysis guard test: claims without a source are removed; scenario text never contains order instructions (buy/sell at, lot size).
- Existing `fundamental-news.test.ts` and `robot-options.test.ts` must still pass.
- Manual: signed-in Playwright run on phone size — Macro tab, event detail, save/unsave, stale and "Not checked" labels.

## Needed from you before build
1. Free API keys: BLS, FRED, BEA (I'll tell you where to get them).
2. ThriveInMarkets: do you have an API or written permission? Otherwise it stays off.
3. Price source for NAS100/US30 — or accept qualitative scenarios for now.
4. Who sees Macro: all logged-in users, or only Fundamental plan subscribers?