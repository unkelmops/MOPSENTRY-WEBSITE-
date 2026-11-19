import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, Clock3, Crosshair, FolderOpen, History, Layers3, Newspaper, ScanSearch, Waves, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadMarketSnapshot, type MarketQuote, type MarketCandle, type MarketFeedHealth } from "@/lib/market-data";


export const Route = createFileRoute("/_authenticated/market-report")({
  head: () => ({ meta: [
    { title: "Market Report — MOPSENTRY EA" },
    { name: "description", content: "Shared live market charts and analysis for Gold, Dow Jones and Nasdaq 100." },
    { property: "og:title", content: "Market Report — MOPSENTRY EA" },
    { property: "og:description", content: "Shared reference prices and charts for XAUUSD, US30 and NAS100." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: MarketReport,
});

const instruments = [
  { symbol: "XAUUSD", name: "Gold" },
  { symbol: "US30", name: "Dow Jones" },
  { symbol: "NAS100", name: "Nasdaq 100" },
] as const;
const timeframes = ["M5", "M15", "H1", "H4"] as const;
const folders = [
  {
    id: "news", title: "News & Economic Events", icon: Newspaper,
    description: "What news may affect the market.",
    pending: "Awaiting verified news and calendar sources.",
    metrics: ["Headlines", "Economic events", "Session outlook"],
    detail: "No headlines or event forecasts are available for this report. Session timing and potential news impact remain pending.",
  },
  {
    id: "structure", title: "Market Structure & Trend", icon: Waves,
    description: "Market direction and signs of a trend change.",
    pending: "Awaiting validated price history.",
    metrics: ["Trend direction", "Break of structure (BOS)", "Change of character (CHoCH)"],
    detail: "BOS means price has broken a previous swing level; CHoCH may indicate a change in direction. No swings, candle history or trend alignment have been confirmed.",
  },
  {
    id: "crt", title: "CRT Analysis", icon: Layers3,
    description: "The price range and possible break or reversal levels.",
    pending: "Awaiting a validated candle range.",
    metrics: ["Range high", "Range low", "Range midpoint"],
    detail: "Range, breakout and reversal levels remain unavailable until qualifying candles are validated.",
  },
  {
    id: "liquidity", title: "Liquidity & Sweeps", icon: Crosshair,
    description: "Where orders may gather and whether price swept them.",
    pending: "Awaiting confirmed price structure.",
    metrics: ["Liquidity areas", "Sweep status", "Reclaim level"],
    detail: "No liquidity pools, sweeps or reclaim levels have been confirmed for this report.",
  },
  {
    id: "strategies", title: "Strategy Scanner", icon: ScanSearch,
    description: "30 strategy checks and whether they agree.",
    pending: "Strategy engine not connected.",
    metrics: ["Buy votes", "Sell votes", "Wait votes"],
    detail: "No strategy checks have run. Consensus, scores and performance remain unavailable; no direction is implied.",
  },
  {
    id: "setup", title: "Trade Setup", icon: Activity,
    description: "Entry, stop loss and target after a verified setup.",
    pending: "Awaiting a setup supported by validated data.",
    metrics: ["Entry", "Stop loss", "Take profit"],
    detail: "No trade levels are available. This report does not place trades or send instructions to your EA.",
  },
  {
    id: "history", title: "Prediction History", icon: History,
    description: "Past calls and their measured outcomes.",
    pending: "No recorded predictions or measured outcomes available.",
    metrics: ["Past calls", "Measured outcomes", "Verified accuracy"],
    detail: "Accuracy requires recorded predictions evaluated against later validated prices. No historical results or accuracy figures are shown.",
  },
] as const;


function CandleChart({ candles }: { candles: MarketCandle[] }) {
  const rows = candles.slice(-96);
  if (rows.length < 2) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Waiting for verified candle history.</div>;
  const width = 1000, height = 340, left = 12, right = 72, top = 16, bottom = 28;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const max = Math.max(...rows.map((candle) => candle.high));
  const min = Math.min(...rows.map((candle) => candle.low));
  const range = Math.max(max - min, 0.000001);
  const y = (value: number) => top + ((max - value) / range) * plotHeight;
  const step = plotWidth / rows.length;
  const bodyWidth = Math.max(3, Math.min(9, step * 0.62));
  const labels = [0, Math.floor(rows.length / 2), rows.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label={`Candlestick chart with ${rows.length} verified candles`} preserveAspectRatio="none">
      {[0, 1, 2, 3].map((line) => {
        const yy = top + (plotHeight / 3) * line;
        const value = max - (range / 3) * line;
        return <g key={line}><line x1={left} x2={width - right + 8} y1={yy} y2={yy} stroke="var(--border)" strokeDasharray="4 7" strokeOpacity=".65"/><text x={width - right + 14} y={yy + 4} fill="var(--muted-foreground)" fontSize="11">{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</text></g>;
      })}
      {rows.map((candle, index) => {
        const x = left + step * index + step / 2;
        const up = candle.close >= candle.open;
        const bodyTop = Math.min(y(candle.open), y(candle.close));
        const bodyHeight = Math.max(2, Math.abs(y(candle.open) - y(candle.close)));
        const color = up ? "var(--profit)" : "var(--loss)";
        return <g key={candle.candle_open_at}><line x1={x} x2={x} y1={y(candle.high)} y2={y(candle.low)} stroke={color} strokeWidth="1.4"/><rect x={x - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={bodyHeight} rx="1" fill={color} stroke={color}/></g>;
      })}
      {labels.map((index) => <text key={index} x={left + step * index + step / 2} y={height - 7} fill="var(--muted-foreground)" fontSize="11" textAnchor={index === 0 ? "start" : index === rows.length - 1 ? "end" : "middle"}>{new Date(rows[index].candle_open_at).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</text>)}
    </svg>
  );
}

function MarketReport() {
  const [symbol, setSymbol] = useState<(typeof instruments)[number]["symbol"]>("XAUUSD");
  const [timeframe, setTimeframe] = useState<(typeof timeframes)[number]>("H1");
  const [openFolder, setOpenFolder] = useState("");
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [candles, setCandles] = useState<MarketCandle[]>([]);
  const [feedHealth, setFeedHealth] = useState<MarketFeedHealth[]>([]);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const selectedFolder = folders.find(folder => folder.id === openFolder);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const snapshot = await loadMarketSnapshot(symbol, timeframe);
        if (!active) return;
        setQuotes(snapshot.quotes);
        setCandles(snapshot.candles);
        setFeedHealth(snapshot.health);
        setLastFetchedAt(snapshot.fetchedAt);
        setLoadError(snapshot.syncError ? "Market feed update issue: " + snapshot.syncError : "");
      } catch {
        if (active) setLoadError("Market data is temporarily unavailable.");
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [symbol, timeframe]);

  const brokerQuote = quotes.find(quote => quote.source === "mt5_broker");
  const brokerStatus = feedHealth.find(item => item.source === "mt5_broker")?.status;
  const brokerQuoteFresh = Boolean(brokerQuote && Date.now() - new Date(brokerQuote.observed_at).getTime() >= 0 && Date.now() - new Date(brokerQuote.observed_at).getTime() < 60_000 && brokerStatus === "healthy");
  const referenceQuote = quotes.find(quote => quote.source === "independent");
  const feedStatus = (source: string) => feedHealth.find(item => item.source === source)?.status ?? "not_configured";
  const formatPrice = (value: number | null) => value == null ? "—" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 5 }).format(value);
  const formatQuoteTime = (value?: string | null) => value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "No tick received";

  return (
    <div className="report-dashboard mx-auto w-full max-w-6xl space-y-4 pb-6">
      <header className="flex items-center gap-3 pt-2">
        <Activity className="h-6 w-6 shrink-0 text-primary" />
        <h1 className="text-2xl font-bold sm:text-3xl">Market Report</h1>
      </header>

      <section aria-label="Live market prices" className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-card via-card/95 to-primary/10 p-4 shadow-glow sm:p-5">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl"/>
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot"/> Shared market feed · {symbol}</div>
            <p className="num mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{formatPrice(referenceQuote?.last ?? null)}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>Bid <strong className="num text-foreground">{formatPrice(referenceQuote?.bid ?? null)}</strong></span><span>Ask <strong className="num text-foreground">{formatPrice(referenceQuote?.ask ?? null)}</strong></span><span className={feedStatus("independent") === "healthy" ? "text-profit" : ""}>{feedStatus("independent").replace("_", " ")}</span></div>
            <p className="mt-2 text-[10px] text-muted-foreground">Shared reference price · Updated {formatQuoteTime(referenceQuote?.observed_at)} · {referenceQuote?.provider_symbol ?? "Provider awaiting data"}</p>
          </div>
          {brokerQuoteFresh && brokerQuote && <div className="min-w-[150px] rounded-xl border border-profit/30 bg-profit/10 px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-wider text-profit">Your broker price</p><p className="num mt-1 text-xl font-bold">{formatPrice(brokerQuote.last)}</p><p className="text-[10px] text-muted-foreground">Bid {formatPrice(brokerQuote.bid)} · Ask {formatPrice(brokerQuote.ask)}</p></div>}
        </div>
      </section>
      {loadError && <p role="status" className="text-xs text-muted-foreground">{loadError}</p>}

      <section aria-label="Live candlestick chart" className="overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-3 shadow-lg backdrop-blur sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="text-sm font-semibold">{symbol} · {timeframe}</h3><p className="text-[11px] text-muted-foreground">Shared reference · Candlestick chart</p></div>
          <span className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground">{candles.length ? `${candles.length} verified candles` : "No candle history"}</span>
        </div>
        <div className="h-64 w-full sm:h-80">
          {candles.length > 1 ? <CandleChart candles={candles}/> : <div className="flex h-full flex-col items-center justify-center gap-2 text-center"><Activity className="h-6 w-6 text-muted-foreground"/><p className="text-sm text-muted-foreground">No verified candle history for this instrument and timeframe yet.</p></div>}
        </div>
      </section>
      <div className="grid grid-cols-3 gap-2" aria-label="Report instrument">
        {instruments.map(item => <Button key={item.symbol} variant="outline" aria-pressed={symbol === item.symbol}
          onClick={() => { setSymbol(item.symbol); setOpenFolder(""); }}
          className={cn("h-auto min-h-14 flex-col gap-0.5 rounded-lg px-2 py-2", symbol === item.symbol ? "border-primary/60 bg-primary/10 text-primary hover:bg-primary/15" : "bg-card/60 text-foreground")}>
          <span className="text-sm font-bold">{item.symbol}</span>
          <span className="text-[11px] font-normal text-muted-foreground">{item.name}</span>
        </Button>)}
      </div>

      <section aria-label="Report overview" className="space-y-3 border-y border-border/70 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{symbol} <span className="text-muted-foreground">/ {timeframe}</span></h2>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> {lastFetchedAt ? `Checked ${formatQuoteTime(lastFetchedAt)}` : "Connecting to market data"}</span>
        </div>
        <div className="flex items-start gap-2">
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div><p className="text-sm font-semibold">Shared {symbol} chart</p><p className="mt-0.5 text-xs text-muted-foreground">Reference market data is shared across MOPSENTRY users. Broker prices may differ.</p></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">Auto-refresh: every 15 seconds · Quote times shown above are source timestamps</p>
          <div className="flex gap-1" aria-label="Report timeframe">
            {timeframes.map(tf => <Button key={tf} size="sm" variant={tf === timeframe ? "secondary" : "ghost"} aria-pressed={tf === timeframe}
              onClick={() => setTimeframe(tf)} className="h-8 px-2 text-xs">{tf}</Button>)}
          </div>
        </div>
      </section>

      <div role="group" aria-label="Analysis folders" className="report-rail flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 pt-1 md:grid md:grid-cols-3 md:overflow-visible xl:grid-cols-4">
        {folders.map((folder, index) => <Button key={folder.id} id={`folder-${folder.id}`} variant="ghost"
          aria-expanded={openFolder === folder.id} aria-controls={`analysis-${folder.id}`}
          onClick={event => {
            setOpenFolder(openFolder === folder.id ? "" : folder.id);
            if (window.matchMedia("(max-width: 767px)").matches) event.currentTarget.scrollIntoView({ block: "nearest", inline: "center" });
          }}
          className={cn("report-folder group relative h-36 w-64 shrink-0 snap-center flex-col items-stretch justify-between overflow-hidden whitespace-normal rounded-lg border p-4 text-left md:w-full", openFolder === folder.id && "report-folder-selected")}>
          <span className="flex items-center justify-between">
            <span className="report-category-icon grid h-8 w-8 place-items-center rounded-md"><folder.icon className="h-4 w-4" /></span>
            <span aria-hidden="true" className="flex items-center gap-2 text-muted-foreground"><span className="report-segments flex gap-1">{[0, 1, 2, 3].map(segment => <span key={segment} className={cn("h-1 w-2 rounded-sm", segment === index % 4 ? "bg-report-highlight/50" : "bg-border/70")} />)}</span><ArrowUpRight className="h-3.5 w-3.5" /></span>
          </span>
          <span><span className="block text-sm font-semibold text-foreground">{folder.title}</span><span className="mt-1 block text-xs font-normal leading-4 text-muted-foreground">{folder.description}</span></span>
        </Button>)}
      </div>
      {folders.map(folder => <section key={folder.id} id={`analysis-${folder.id}`} hidden={selectedFolder?.id !== folder.id} aria-labelledby={`folder-${folder.id}`} className="report-detail border-y border-border/70 py-4">
        {selectedFolder?.id === folder.id && <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><FolderOpen className="h-4 w-4 text-report-highlight" />{folder.title}</h2>
            <Button variant="ghost" size="icon" aria-label="Close analysis" onClick={() => { setOpenFolder(""); document.getElementById(`folder-${folder.id}`)?.focus(); }}><X /></Button>
          </div>
          <p className="mb-3 text-xs font-medium text-report-highlight">{folder.pending}</p>
          <dl className="grid gap-3 sm:grid-cols-3">
            {folder.metrics.map(metric => <div key={metric} className="border-l border-report-highlight/30 pl-3"><dt className="text-xs text-muted-foreground">{metric}</dt><dd className="mt-1 font-mono text-lg">—</dd></div>)}
          </dl>
          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">{folder.detail}</p>
        </>}
      </section>)}
      <p className="text-[11px] leading-relaxed text-muted-foreground">Market charts use a shared external reference feed. No trading signals or accuracy figures are generated until the analysis engine is validated.</p>
    </div>
  );
}
