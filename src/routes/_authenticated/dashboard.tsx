import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  Target,
  Clock3,
  Link2,
  Power,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Trade } from "@/lib/demo-data";
import { supabase } from "@/integrations/supabase/client";
import { robotSettingsQuery } from "@/lib/robot-settings";
import { tradingAccountQuery } from "@/lib/trading-account";
import { saveRobotSettings } from "@/lib/robot-settings";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Overview — MOPSENTRY EA" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(robotSettingsQuery),
      context.queryClient.ensureQueryData(tradingAccountQuery),
    ]),
  pendingComponent: DashboardLoading,
  component: Dashboard,
});

function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-24" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl border bg-card/70 p-4 text-sm text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Connecting to MOPSENTRY and loading your account…
      </div>
      <div className="h-24 animate-pulse rounded-2xl border bg-muted/40" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 animate-pulse rounded-xl border bg-muted/40" />
        <div className="h-20 animate-pulse rounded-xl border bg-muted/40" />
      </div>
      <div className="h-32 animate-pulse rounded-2xl border bg-muted/40" />
    </div>
  );
}

const money = (n: number, currency: string | null) => {
  const formatted = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!currency || !/^[A-Z]{3}$/.test(currency)) return formatted;
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n); }
  catch { return `${formatted} ${currency}`; }
};


function OverviewTradeSetup() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-report-highlight/30 bg-gradient-to-r from-report-highlight/10 via-card/90 to-card p-4 sm:p-5" aria-label="Trade setup preview">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-report-highlight/30 bg-report-highlight/10 text-report-highlight"><Target className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-report-highlight">Setup watch</p><h2 className="mt-1 font-semibold">Trade Setup</h2></div>
            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground">No confirmed setup</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Entry, stop loss and targets will appear here only when the market analysis confirms a valid setup. No levels are being guessed.</p>
          <Link to="/market-report" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-report-highlight hover:underline">View setup analysis <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </div>
      </div>
    </section>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const { data: s } = useSuspenseQuery(robotSettingsQuery);
  const { data: ta } = useSuspenseQuery(tradingAccountQuery);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [breakEvenTrigger, setBreakEvenTrigger] = useState(String(s.break_even_trigger ?? 10));
  const [savedBreakEvenTrigger, setSavedBreakEvenTrigger] = useState(String(s.break_even_trigger ?? 10));
  const [displayCurrency, setDisplayCurrency] = useState("ZAR");
  const [conversionRate, setConversionRate] = useState<number | null>(null);
  useEffect(() => {
    if (!accountCurrency || !/^[A-Z]{3}$/.test(accountCurrency)) { setConversionRate(null); return; }
    if (accountCurrency === displayCurrency) { setConversionRate(1); return; }
    let active = true;
    setConversionRate(null);
    fetch(`https://open.er-api.com/v6/latest/${accountCurrency}`).then((response) => response.json()).then((data) => {
      const rate = Number(data?.rates?.[displayCurrency]);
      if (active) setConversionRate(Number.isFinite(rate) && rate > 0 ? rate : null);
    }).catch(() => { if (active) setConversionRate(null); });
    return () => { active = false; };
  }, [accountCurrency, displayCurrency]);
  const displayMoney = (value: number | null) => value == null ? "—" : conversionRate == null ? "Rate unavailable" : money(value * conversionRate, displayCurrency);
  const accountCurrency = ta.account_currency?.toUpperCase() ?? null;
  const breakEvenSave = useMutation({
    mutationFn: async (enabled: boolean) => {
      const trigger = Number(breakEvenTrigger);
      if (!Number.isFinite(trigger) || trigger <= 0) throw new Error("Enter a profit threshold greater than zero.");
      await saveRobotSettings({ break_even_enabled: enabled, break_even_trigger: trigger });
    },
    onSuccess: (_data, enabled) => { if (!enabled) setSavedBreakEvenTrigger(breakEvenTrigger); toast.success("Break-even settings saved."); void qc.invalidateQueries({ queryKey: robotSettingsQuery.queryKey }); },
    onError: (error: Error) => toast.error(error.message || "Could not save break-even settings."),
  });

  // Supabase realtime makes the screen react to a new EA check-in immediately.
  // The two-second query polling remains as a fallback.
  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    void supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      channel = supabase
        .channel(`trading-account-${data.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "trading_accounts",
            filter: `user_id=eq.${data.user.id}`,
          },
          () => {
            void qc.invalidateQueries({ queryKey: tradingAccountQuery.queryKey });
          },
        )
        .subscribe();
    });

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [qc]);

  const lastBeat = ta.last_heartbeat ? new Date(ta.last_heartbeat) : null;
  const heartbeatAge = lastBeat ? Date.now() - lastBeat.getTime() : Number.POSITIVE_INFINITY;
  const fresh = Boolean(
    ta.status === "connected" && ta.balance != null && Number.isFinite(heartbeatAge) && heartbeatAge >= 0 && heartbeatAge < 30_000,
  );
  const compatibleEA = fresh && ta.ea_version === "1.73";
  const balance = fresh ? Number(ta.balance) : null;
  const equity = fresh ? Number(ta.equity ?? ta.balance) : null;
  const floatingPnl = balance != null && equity != null ? equity - balance : null;
  const connectionLabel = fresh ? "MT5 connected" : ta.last_heartbeat ? (heartbeatAge >= 0 && heartbeatAge < 120_000 ? "Connection stale" : "Disconnected") : "Waiting for MT5 data";
  const rawTrades = (ta.open_trades ?? []) as Array<Record<string, unknown>>;
  const pendingOrders = fresh ? ((ta.pending_orders ?? []) as Array<Record<string, unknown>>) : [];
  const trades: Trade[] = fresh
    ? rawTrades.map((t, i) => ({
        id: String(t["ticket"] ?? `${String(t["symbol"] ?? "position")}-${i}`),
        pair: String(t["symbol"] ?? t["pair"] ?? ""),
        side: t["side"] === "SELL" ? "SELL" : "BUY",
        lots: Number(t["lots"] ?? t["volume"] ?? 0),
        open: Number(t["open_price"] ?? t["open"] ?? 0),
        current: Number(t["current_price"] ?? t["current"] ?? 0),
        pnl: Number(t["profit"] ?? t["pnl"] ?? 0),
      }))
    : [];

  const closeAll = useMutation({
    mutationFn: async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Please sign in again before sending a trading command.");
      if (!fresh) throw new Error("MT5 connection is not fresh. Reconnect before sending Close All.");
      if (!compatibleEA) throw new Error("Install and compile MOPSENTRY EA v1.73 first. Older versions cannot receive this app command.");
      if (rawTrades.length === 0) throw new Error("MT5 reports no open positions.");
      const { data: existingCommand, error: existingCommandError } = await supabase
        .from("robot_commands")
        .select("id")
        .eq("user_id", auth.user.id)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();
      if (existingCommandError) throw existingCommandError;
      if (existingCommand) throw new Error("A Close All request is already waiting for MT5. Wait for it to be acknowledged before sending another.");
      const { data, error } = await supabase
        .from("robot_commands")
        .insert({ user_id: auth.user.id, command: "CLOSE_ALL", status: "pending" })
        .select("id, status, created_at")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setCloseDialogOpen(false);
      toast.success("Close All request queued. Waiting for the MT5 EA to receive it.");
      void qc.invalidateQueries({ queryKey: tradingAccountQuery.queryKey });
    },
    onError: (error: Error) => toast.error(error.message || "Could not queue Close All request."),
  });

  const disabledClose = !fresh || !compatibleEA || rawTrades.length === 0 || closeAll.isPending;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 pb-24">
      <div className={cn("flex items-center justify-between rounded-2xl border p-5", fresh ? "border-primary bg-primary/10 shadow-glow" : "bg-card")}>
        <div>
          <p className="text-sm text-muted-foreground">Trading account</p>
          <p className="text-2xl font-bold">
            {fresh ? "Connected" : connectionLabel === "Connection stale" ? "Stale connection" : ta.last_heartbeat ? "Disconnected" : "Not connected yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Robot {s.is_running ? "running" : "stopped"}</p>
          {lastBeat && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              Last check-in {lastBeat.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="mops-orb-wrap" aria-hidden="true">
          <div className={cn("mops-orb", fresh ? "mops-orb-live" : "mops-orb-idle")}>
            <span className="mops-orb-core">M</span>
            <span className="mops-orb-ring mops-orb-ring-one" />
            <span className="mops-orb-ring mops-orb-ring-two" />
            <span className="mops-orb-spark mops-orb-spark-one" />
            <span className="mops-orb-spark mops-orb-spark-two" />
          </div>
        </div>
                <span className={cn("h-3 w-3 rounded-full", fresh ? "bg-profit animate-pulse-dot" : "bg-muted-foreground")} />
      </div>

      {!fresh && (
        <Link
          to="/account"
          className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm"
        >
          <Link2 className="h-5 w-5 shrink-0 text-primary" />
          <span>
            <span className="font-semibold text-primary">Connect your trading account</span>
            <span className="block text-muted-foreground">
              Connect MT5 to begin receiving real account data. No sample account numbers are shown.
            </span>
          </span>
        </Link>
      )}<section className="relative isolate overflow-hidden rounded-2xl border bg-card shadow-glow before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/70 before:to-transparent">
        <div className="flex items-start justify-between gap-4 p-5 pb-3">
          <div>
            <p className="text-sm text-muted-foreground">Account equity</p>
            <p className="num mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{displayMoney(equity)}</p>
            <p className={cn("num mt-2 flex items-center gap-1.5 text-sm font-medium", floatingPnl == null ? "text-muted-foreground" : floatingPnl >= 0 ? "text-profit" : "text-loss")}>
              <TrendingUp className="h-4 w-4" />
              {floatingPnl == null ? "—" : `${floatingPnl >= 0 ? "+" : ""}${displayMoney(floatingPnl)}`} <span className="font-normal text-muted-foreground">floating P/L</span>
            </p>
          </div>
          <div className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium", fresh ? "border-primary/30 bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
            {fresh ? "LIVE" : connectionLabel === "Connection stale" ? "STALE" : connectionLabel === "Disconnected" ? "OFFLINE" : "WAITING"}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-2">
          <div className="rounded-xl bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="num mt-1 font-semibold">{displayMoney(balance)}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Open positions</p>
            <p className="num mt-1 font-semibold">{fresh ? rawTrades.length : "—"}</p>
          </div>
        </div>

        {fresh ? (
          <div className="border-t px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-muted p-2"><Activity className="h-4 w-4 text-muted-foreground" /></div>
              <div>
                <p className="text-sm font-medium">Equity history</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  This is the latest MT5 equity snapshot. Historical points are not being stored yet, so no fabricated trend line is shown.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t px-5 py-4 text-sm text-muted-foreground">
            {ta.last_heartbeat ? "Account snapshot is stale. Reconnect the EA to refresh live telemetry." : "Waiting for the first MT5 check-in. Live equity history will appear only after real history is collected."}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-primary/25 bg-card p-5 shadow-glow" aria-label="Break-even protection">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Break-Even Protection</p>
            <p className="mt-1 text-xs text-muted-foreground">When combined floating profit across all open positions reaches your target, the EA can move eligible positions' stop-losses to their entry prices.</p>
          </div>
          <Button size="sm" variant={s.break_even_enabled ? "default" : "outline"} disabled={breakEvenSave.isPending || breakEvenTrigger !== savedBreakEvenTrigger} onClick={() => breakEvenSave.mutate(!s.break_even_enabled)}>
            {breakEvenSave.isPending ? "Saving…" : s.break_even_enabled ? "ON" : "OFF"}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[180px] flex-1 text-xs text-muted-foreground">
            Combined floating-profit trigger {accountCurrency ? `(${accountCurrency})` : "(account currency)"}
            <input type="number" min="0.01" step="0.01" value={breakEvenTrigger} onChange={(event) => setBreakEvenTrigger(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground" />
          </label>
          <Button variant="secondary" size="sm" disabled={breakEvenSave.isPending || !Number.isFinite(Number(breakEvenTrigger)) || Number(breakEvenTrigger) <= 0} onClick={() => breakEvenSave.mutate(false)}>Save threshold</Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Account currency: {accountCurrency ?? "waiting for MT5 currency data"}. This setting is saved to your account; EA-side execution requires an EA build that reads the new settings.</p>
      </section>

      <Link
        to="/market-report"
        className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/90 to-card p-4 shadow-glow transition-colors hover:border-primary/60"
      >
        <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
        <span className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary"><BrainCircuit className="h-5 w-5" /></span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-primary">MOPSENTRY INTELLIGENCE</span>
            <span className="mt-1 block font-semibold text-foreground">Market Report</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Explore shared market charts and analysis for Gold, US30 and NAS100.</span>
          </span>
        </span>
        <ArrowUpRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>

      <OverviewTradeSetup />

      {fresh && !compatibleEA && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-muted-foreground">
            Update MT5 to MOPSENTRY EA v1.73 to enable Close All and full-account pending-order sync. The current EA version does not identify itself as compatible yet.
          </p>
        </div>
      )}

      <details className="group rounded-xl border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm [&::-webkit-details-marker]:hidden"><span className="font-semibold">Open positions</span><span className="text-xs text-muted-foreground">{fresh ? rawTrades.length : "—"} · Tap to view</span></summary>
        <div className="border-t p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Open positions</h2>
          <Button variant="destructive" size="sm" disabled={disabledClose} onClick={() => setCloseDialogOpen(true)}>
            <Power className="mr-2 h-4 w-4" />
            Close All Positions
          </Button>
        </div>
        <div className="space-y-2">
          {trades.length === 0 ? (
            <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              {fresh ? "No open positions reported by MT5." : "No fresh position data available."}
            </div>
          ) : (
            trades.map((t) => (
              <div key={t.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 sm:flex-nowrap">
                <div className="min-w-0">
                  <p className="font-semibold">{t.pair}</p>
                  <p className="num text-xs text-muted-foreground">
                    <span className={t.side === "BUY" ? "text-profit" : "text-loss"}>{t.side}</span> {t.lots} lots @ {t.open}
                  </p>
                </div>
                <p className={cn("num shrink-0 font-semibold", t.pnl >= 0 ? "text-profit" : "text-loss")}>
                  {t.pnl >= 0 ? "+" : ""}{displayMoney(t.pnl)}
                </p>
              </div>
            ))
          )}
        </div>
        {fresh && rawTrades.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Close All targets positions tagged with MOPSENTRY's magic number across symbols. Manually opened trades are not closed by this command.
          </p>
        )}
        </div>
      </details>

      <details className="group rounded-xl border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm [&::-webkit-details-marker]:hidden"><span className="font-semibold">Pending orders</span><span className="text-xs text-muted-foreground">{fresh ? pendingOrders.length : "—"} · Tap to view</span></summary>
        <div className="border-t p-4">
        <div className="space-y-2">
          {pendingOrders.length === 0 ? (
            <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              {fresh ? "No pending orders reported by MT5." : "No fresh pending-order data available."}
            </div>
          ) : (
            pendingOrders.map((order, i) => {
              const type = String(order["type"] ?? "PENDING").replaceAll("_", " ");
              const entry = Number(order["entry_price"] ?? 0);
              const volume = Number(order["volume"] ?? 0);
              const ticket = String(order["ticket"] ?? i);
              return (
                <div key={ticket} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{String(order["symbol"] ?? "")}</p>
                      <p className="num text-xs text-muted-foreground">{type} · {volume} lots · #{ticket}</p>
                    </div>
                    <p className="num text-sm font-semibold">@ {entry}</p>
                  </div>
                  <p className="num mt-2 text-xs text-muted-foreground">
                    SL: {order["sl"] == null ? "—" : String(order["sl"])} · TP: {order["tp"] == null ? "—" : String(order["tp"])}
                    {order["expiration"] ? " · Expires " + String(order["expiration"]) : ""}
                  </p>
                </div>
              );
            })
          )}
        </div>
        </div>
      </details>

      <Button
        className="fixed bottom-[86px] left-5 z-40 rounded-full px-5 shadow-xl"
        variant="destructive"
        disabled={disabledClose}
        onClick={() => setCloseDialogOpen(true)}
        aria-label="Close all MOPSENTRY positions"
      >
        <Power className="mr-2 h-4 w-4" />
        Close All
      </Button>

      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Close all MOPSENTRY positions?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This sends a command to the connected MT5 EA. It targets positions with MOPSENTRY's magic number across symbols; manual trades are left alone. Closing positions can realise losses, and the request may take a few seconds to reach MT5.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closeAll.isPending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={disabledClose} onClick={() => closeAll.mutate()}>
              {closeAll.isPending ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Sending…</> : "Confirm Close All"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
