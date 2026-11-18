import { SignalsBackdrop } from "@/components/signals-backdrop";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, BellRing, CalendarClock,
  Newspaper, Radio, RefreshCw, ShieldAlert, ChevronDown,
} from "lucide-react";
import { tradingAccountQuery } from "@/lib/trading-account";
import { supabase } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";
import {
  buildFundamentalOutlook,
  classifyEvent,
  fetchUsdEconomicCalendar,
  getSeriesKey,
  parseEconomicValue,
  type HistoricalEvent,
  type UsdDirection,
} from "@/lib/fundamental-news";

export const Route = createFileRoute("/_authenticated/signals")({
  head: () => ({
    meta: [
      { title: "Signals — MOPSENTRY EA" },
      { name: "description", content: "Simple explanations of important USD economic events." },
    ],
  }),
  component: Signals,
});

type LiveTrade = { ticket?: number; symbol: string; side: string; lots: number; open_price: number; current_price?: number };
type PendingOrder = { ticket: number; symbol: string; type: string; volume: number; entry_price: number; sl?: number; tp?: number; expiration?: string };

function formatSast(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time not confirmed";
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date) + " SAST";
}

function directionLabel(direction: UsdDirection) {
  if (direction === "bullish") return "USD may strengthen";
  if (direction === "bearish") return "USD may weaken";
  if (direction === "neutral") return "No clear direction";
  return "Not enough data";
}

function directionStyle(direction: UsdDirection) {
  if (direction === "bullish") return "bg-emerald-500/10 text-emerald-500";
  if (direction === "bearish") return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
}

function goldMeaning(direction: UsdDirection) {
  if (direction === "bullish") return "Gold may face downward pressure if the market reacts this way.";
  if (direction === "bearish") return "Gold may get support if the market reacts this way.";
  if (direction === "neutral") return "This event alone gives no clear direction for Gold.";
  return "There is not enough information to suggest a Gold direction.";
}

function SignalSummary({ direction, actualDirection }: {
  direction: UsdDirection;
  actualDirection?: UsdDirection | undefined;
}) {
  const signal = actualDirection && actualDirection !== "unavailable" ? actualDirection : direction;
  const usdSide = signal === "bullish" ? "BUY USD" : signal === "bearish" ? "SELL USD" : "WAIT";
  const goldSide = signal === "bullish" ? "SELL XAUUSD" : signal === "bearish" ? "BUY XAUUSD" : "WAIT";
  const tone = signal === "bullish" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
    : signal === "bearish" ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
    : "border-border bg-muted/50 text-muted-foreground";

  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      <div className={`rounded-xl border p-3 ${tone}`}>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">USD bias</p>
        <p className="mt-1 text-sm font-black">{usdSide}</p>
      </div>
      <div className={`rounded-xl border p-3 ${tone}`}>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Gold bias</p>
        <p className="mt-1 text-sm font-black">{goldSide}</p>
      </div>
      <p className="col-span-2 text-[10px] text-muted-foreground">News direction only. Confirm with price action.</p>
    </div>
  );
}

function getEventGroup(title: string) {
  const value = title.toLowerCase();
  if (/consumer price index|\bcpi\b/.test(value)) return "CPI";
  if (/producer price index|\bppi\b/.test(value)) return "PPI";
  if (/non.?farm payroll|payroll employment|employment change|unemployment rate|average hourly earnings|wage growth/.test(value)) return "NFP";
  if (/fomc|federal funds rate|fed funds|interest rate decision|target rate|monetary policy statement|fed chair.*press conference/.test(value)) return "FOMC";
  if (/gross domestic product|\bgdp\b/.test(value)) return "GDP";
  if (/personal consumption expenditures|\bpce\b/.test(value)) return "PCE Inflation";
  if (/retail sales/.test(value)) return "Retail Sales";
  if (/initial jobless claims|continuing jobless claims|unemployment claims/.test(value)) return "Jobless Claims";
  if (/ism .*pmi|manufacturing index|services index/.test(value)) return "ISM PMI";
  return title;
}

function FundamentalEvents() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [eventView, setEventView] = useState<"upcoming" | "released">("upcoming");
  const history = useQuery({
    queryKey: ["fundamental-event-history"],
    queryFn: async (): Promise<{ events: HistoricalEvent[]; fetched_at: string | null }> => {
      const { data, error } = await supabase.functions.invoke("mopsentry-fundamental-history");
      if (error) throw new Error("Past release history is not available yet.");
      return data as { events: HistoricalEvent[]; fetched_at: string | null };
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
  });
  const calendar = useQuery({
    queryKey: ["fundamental-usd-calendar"],
    queryFn: fetchUsdEconomicCalendar,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    retry: 2,
  });

  const events = (calendar.data?.events ?? [])
    .filter((event) => event.currency === "USD" && event.impact === "high")
    .sort((a, b) => a.ts - b.ts);
  const upcoming = events.filter((event) => event.ts * 1000 > Date.now());
  const archived = history.data?.events ?? [];
  const released = archived
    .filter((item) => item.actual_value?.trim() && item.actual_value !== "—" && new Date(item.event_time).getTime() <= Date.now())
    .map((item) => ({
      id: item.event_id,
      ts: Math.floor(new Date(item.event_time).getTime() / 1000),
      time: item.event_time,
      currency: "USD",
      impact: "high",
      title: item.title,
      previous: item.previous_value || "",
      forecast: item.forecast_value || "",
      actual: item.actual_value,
      status: "released",
      ...(item.period == null ? {} : { period: item.period }),
    }))
    .sort((a, b) => b.ts - a.ts);
  const visibleEvents = eventView === "upcoming" ? upcoming : released;
  const outlook = buildFundamentalOutlook(visibleEvents, archived);
  const monthGroups = Array.from(visibleEvents.reduce((map, event) => {
    const date = new Date(event.ts * 1000);
    const monthKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit" }).format(date).slice(0, 7);
    const list = map.get(monthKey) ?? [];
    list.push(event);
    map.set(monthKey, list);
    return map;
  }, new Map<string, typeof upcoming>()).entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([monthKey, monthEvents]) => ({
    monthKey,
    label: new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", month: "long", year: "numeric" }).format(new Date(monthEvents[0]!.ts * 1000)),
    groups: Array.from(monthEvents.reduce((map, event) => {
      const label = getEventGroup(event.title);
      const list = map.get(label) ?? [];
      list.push(event);
      map.set(label, list);
      return map;
    }, new Map<string, typeof upcoming>()).entries()).sort((a, b) => (a[1][0]?.ts ?? 0) - (b[1][0]?.ts ?? 0)),
  }));
  const allGroups = monthGroups.flatMap((month) => month.groups.map(([label, items]) => ({ key: `${month.monthKey}::${label}`, label, items })));
  const activeGroup = allGroups.find((group) => group.key === selectedGroup);
  const activeGroupOutlook = activeGroup ? buildFundamentalOutlook(activeGroup.items, archived) : null;
  const lastUpdated = calendar.dataUpdatedAt
    ? new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", hour12: false }).format(calendar.dataUpdatedAt) + " SAST"
    : null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold"><Newspaper className="h-4 w-4 text-primary" />Economic events</h2>
          <p className="mt-1 text-xs text-muted-foreground">Released events remain available for review.</p>
        </div>
        <button type="button" onClick={() => void calendar.refetch()} disabled={calendar.isFetching} aria-label="Refresh events" className="rounded-lg border p-2 text-muted-foreground disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${calendar.isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <details className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold text-foreground"><ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />Disclaimer · not financial advice</summary>
        <p className="mt-2">MOPSENTRY event analysis is educational market commentary, not financial advice or a trade recommendation. Bias is estimated from the calendar figures and available history; it is not a prediction or guarantee. Actual results, revisions, liquidity, and price reactions can differ. Always verify the official release and manage your own risk.</p>
      </details>

      <div className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/40 p-1">
        <button type="button" onClick={() => { setEventView("upcoming"); setSelectedGroup(null); }} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${eventView === "upcoming" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          Upcoming <span className="ml-1 opacity-70">{upcoming.length}</span>
        </button>
        <button type="button" onClick={() => { setEventView("released"); setSelectedGroup(null); }} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${eventView === "released" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
          Released <span className="ml-1 opacity-70">{released.length}</span>
        </button>
      </div>

      {calendar.isPending && history.isPending ? (
        <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground"><RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />Loading economic events…</div>
      ) : calendar.isError && (eventView === "upcoming" || history.isError) ? (
        <div className="rounded-xl border border-destructive/30 bg-card p-4">
          <p className="font-medium text-destructive">Events could not load</p>
          <p className="mt-1 text-sm text-muted-foreground">{calendar.error instanceof Error ? calendar.error.message : "The calendar is unavailable."} {eventView === "released" ? "Past releases are also unavailable right now." : ""}</p>
          <button type="button" onClick={() => { void calendar.refetch(); void history.refetch(); }} className="mt-3 rounded-lg border px-3 py-2 text-sm">Try again</button>
        </div>
      ) : (
        <>
          {!selectedGroup ? (
            <>
              <div className="rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Overall USD outlook</p>
                    <p className="mt-1 font-semibold">{directionLabel(outlook.direction)}</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${directionStyle(outlook.direction)}`}>{outlook.scoredCount} analysed</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{goldMeaning(outlook.direction)}</p>
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{eventView === "upcoming" ? "Upcoming economic calendar" : "Released news and post-news bias"}</h3>
                <span className="text-xs text-muted-foreground">Tap a month to expand</span>
              </div>
              {monthGroups.length === 0 ? (
                <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">{eventView === "upcoming" ? "No upcoming high-impact USD events were returned." : "No released events with recorded actual figures are available yet. Past releases will stay here once collected."}</div>
              ) : (
                <div className="space-y-2">
                  {monthGroups.map((month, monthIndex) => (
                    <details key={month.monthKey} open={monthIndex === 0} className="overflow-hidden rounded-xl border bg-card">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold">
                        <span>{month.label}</span>
                        <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">{month.groups.length} event groups · {month.groups.reduce((sum, [, items]) => sum + items.length, 0)} releases <ChevronDown className="h-4 w-4" /></span>
                      </summary>
                      <div className="grid grid-cols-1 gap-2 border-t p-3 sm:grid-cols-2">
                        {month.groups.map(([label, items]) => {
                          const next = items[0];
                          const groupOutlook = buildFundamentalOutlook(items, archived);
                          const direction = groupOutlook.direction;
                          const key = `${month.monthKey}::${label}`;
                          return (
                            <button key={key} type="button" onClick={() => setSelectedGroup(key)} className="w-full rounded-xl border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/50 active:scale-[0.99]">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold">{label}</span>
                                <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${directionStyle(direction)}`}>{direction === "unavailable" ? "Not enough data" : direction === "neutral" ? "Mixed · no clear bias" : directionLabel(direction)}</span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{items.length === 1 ? items[0]?.title : `${items.length} related figures combined`}</p>
                              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                                <span>{next ? formatSast(next.time) : ""}</span>
                                <span className="inline-flex items-center gap-1 text-primary">View combined signal <ChevronDown className="h-3.5 w-3.5 -rotate-90" /></span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </details>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                <span>Source: ShowMyTrades economic calendar</span>
                <span>{lastUpdated ? `Updated ${lastUpdated}` : "Update time unavailable"}</span>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <button type="button" onClick={() => setSelectedGroup(null)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium">
                <ArrowDownRight className="h-4 w-4 rotate-45" />All event groups
              </button>
              <div>
                <h3 className="text-xl font-semibold">{activeGroup?.label ?? selectedGroup?.split("::").at(-1)}</h3>
                <p className="text-xs text-muted-foreground">{activeGroup?.items.length ?? 0} related figures · times shown in SAST</p>
              </div>
              {activeGroupOutlook && activeGroup && (
                <SignalSummary direction={activeGroupOutlook.direction} actualDirection={activeGroupOutlook.direction} />
              )}
              {activeGroup?.items.map((event) => {
                const seriesKey = getSeriesKey(event.id);
                const past = seriesKey ? archived.filter((item) => item.series_key === seriesKey && item.actual_value && new Date(item.event_time).getTime() < event.ts * 1000).slice(0, 4) : [];
                return (
                  <article key={event.id ?? `${event.ts}-${event.title}`} className="rounded-xl border bg-card p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">HIGH IMPACT</span>
                      {eventView === "released" ? <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">RELEASED</span> : null}
                      {event.status === "tentative" && <span className="text-[10px] text-amber-500">Time not final</span>}
                    </div>
                    <h4 className="mt-2 font-semibold leading-snug">{event.title}</h4>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" />{formatSast(event.time)}</p>
                    
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-lg bg-muted/50 p-2"><p className="text-[10px] text-muted-foreground">Previous</p><p className="mt-1 font-mono font-semibold">{event.previous || "—"}</p></div>
                      <div className="rounded-lg bg-muted/50 p-2"><p className="text-[10px] text-muted-foreground">Expected</p><p className="mt-1 font-mono font-semibold">{event.forecast || "—"}</p></div>
                      <div className="rounded-lg bg-muted/50 p-2"><p className="text-[10px] text-muted-foreground">Actual</p><p className="mt-1 font-mono font-semibold">{event.actual && event.actual.trim() && event.actual !== "—" ? event.actual : "Not released"}</p></div>
                    </div>

                    {eventView === "released" && (
                      <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Post-news assessment</p>
                        <p className="mt-1 text-xs text-foreground">Actual result compared with forecast. The USD and XAUUSD bias is shown in the event-group analysis above; it is not a confirmed entry. Wait for price action to confirm the market reaction.</p>
                      </div>
                    )}
                    <div className="mt-3 border-t pt-3">
                      <p className="text-[11px] font-semibold text-muted-foreground">Past results</p>
                      {past.length ? past.map((item) => (
                        <div key={item.event_id} className="mt-1 flex justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">{item.period || formatSast(item.event_time)}</span>
                          <span className="font-mono">Actual {item.actual_value}</span>
                        </div>
                      )) : <p className="mt-1 text-xs text-muted-foreground">{history.isError ? "Past results are unavailable." : "Past results will appear here as MOPSENTRY collects them."}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
function Signals() {
  const [activeTab, setActiveTab] = useState<"news" | "trades" | "orders">("news");
  const { data: ta } = useQuery(tradingAccountQuery);
  const live = (Array.isArray(ta?.open_trades) ? ta!.open_trades : []) as unknown as LiveTrade[];
  const orders = (Array.isArray(ta?.pending_orders) ? ta!.pending_orders : []) as unknown as PendingOrder[];

  const tabs = [
    { id: "news" as const, label: "News", count: undefined },
    { id: "trades" as const, label: "Live trades", count: live.length },
    { id: "orders" as const, label: "Pending", count: orders.length },
  ];

  return (
    <>
    <SignalsBackdrop />
    <div className="signals-page space-y-3 pb-2">
      <section className="signals-hero flex items-center justify-between gap-3 rounded-2xl border border-primary/30 px-3 py-2.5">
        <h1 className="signals-hero-title truncate text-lg font-black tracking-tight">Signals</h1>
        <div className="flex shrink-0 gap-3 text-[11px] text-muted-foreground">
          <span>Live <b className="num text-primary">{live.length}</b></span>
          <span>Pending <b className="num text-primary">{orders.length}</b></span>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-1 rounded-xl border bg-muted/40 p-1">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors ${activeTab === tab.id ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
            {tab.label}{tab.count !== undefined && <span className="ml-1 opacity-70">{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === "news" && <FundamentalEvents />}

      {activeTab === "trades" && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><Radio className="h-4 w-4 text-primary" />Live trades</h2>
            <span className="text-xs text-muted-foreground">{live.length} open</span>
          </div>
          {live.length === 0 ? (
            <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">No open trades right now.</div>
          ) : live.map((trade, index) => {
            const buy = trade.side !== "SELL";
            return (
              <div key={trade.ticket ?? index} className="rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{trade.symbol} · {buy ? "BUY" : "SELL"}</span>
                  <span className="font-mono text-xs text-muted-foreground">{trade.lots} lots</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-xs text-muted-foreground">Entry</p><span className="font-mono">{trade.open_price ? trade.open_price.toFixed(2) : "—"}</span></div>
                  <div><p className="text-xs text-muted-foreground">Current</p><span className="font-mono">{trade.current_price ? trade.current_price.toFixed(2) : "—"}</span></div>
                </div>
                {buy ? <ArrowUpRight className="sr-only" /> : <ArrowDownRight className="sr-only" />}
              </div>
            );
          })}
        </section>
      )}

      {activeTab === "orders" && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Pending orders</h2>
            <span className="text-xs text-muted-foreground">{orders.length} waiting</span>
          </div>
          {orders.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4 text-sm text-muted-foreground"><BellRing className="h-4 w-4" />No pending orders.</div>
          ) : orders.map((order) => (
            <div key={order.ticket} className="rounded-xl border bg-card p-3">
              <p className="font-semibold">{order.symbol} · {order.type.replace(/_/g, " ")}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div><p className="text-xs text-muted-foreground">Entry</p><span className="font-mono">{order.entry_price.toFixed(2)}</span></div>
                <div><p className="text-xs text-muted-foreground">Stop loss</p><span className="font-mono">{order.sl?.toFixed(2) ?? "—"}</span></div>
                <div><p className="text-xs text-muted-foreground">Take profit</p><span className="font-mono">{order.tp?.toFixed(2) ?? "—"}</span></div>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p>News signals are possibilities, not guarantees. The actual result and market reaction can differ. This feature does not place trades.</p>
      </div>
    </div>
    </>
  );
}
