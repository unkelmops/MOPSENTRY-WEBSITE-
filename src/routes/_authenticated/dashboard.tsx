import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
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
  try { return new Intl.NumberFormat("en-ZA", { style: "currency", currency, currencyDisplay: "symbol" }).format(n); }
  catch { return `${formatted} ${currency}`; }
};



function Dashboard() {
  const qc = useQueryClient();
  const { data: s } = useSuspenseQuery(robotSettingsQuery);
  const { data: ta } = useSuspenseQuery(tradingAccountQuery);
  const accountSnapshot = ta;
  const [breakEvenDialogOpen, setBreakEvenDialogOpen] = useState(false);
  const [breakEvenTrigger, setBreakEvenTrigger] = useState(String(s.break_even_trigger ?? 10));
  const [savedBreakEvenTrigger, setSavedBreakEvenTrigger] = useState(String(s.break_even_trigger ?? 10));
  const [displayCurrency, setDisplayCurrency] = useState("ZAR");
  useEffect(() => { const sync = () => { try { const saved = localStorage.getItem("mopsentry-currency"); if (saved && /^[A-Z]{3}$/.test(saved)) setDisplayCurrency(saved); } catch { /* optional storage */ } }; sync(); window.addEventListener("mopsentry-currency-change", sync); return () => window.removeEventListener("mopsentry-currency-change", sync); }, []);
  const [conversionRate, setConversionRate] = useState<number | null>(null);
  const accountCurrency = accountSnapshot.account_currency?.toUpperCase() ?? null;
  useEffect(() => {
    let active = true;
    const loadRate = async () => {
      if (!accountCurrency || !/^[A-Z]{3}$/.test(accountCurrency)) { setConversionRate(null); return; }
      if (accountCurrency === displayCurrency) { setConversionRate(1); return; }
      setConversionRate(null);
      try {
        const response = await fetch(`https://api.frankfurter.dev/v1/latest?base=${accountCurrency}&symbols=${displayCurrency}`);
        if (response.ok) {
          const data = await response.json();
          const rate = Number(data?.rates?.[displayCurrency]);
          if (Number.isFinite(rate) && rate > 0) { if (active) setConversionRate(rate); return; }
        }
      } catch { /* fallback below */ }
      try {
        const response = await fetch(`https://open.er-api.com/v6/latest/${accountCurrency}`);
        if (!response.ok) throw new Error("FX provider unavailable");
        const data = await response.json();
        const rate = Number(data?.rates?.[displayCurrency]);
        if (!Number.isFinite(rate) || rate <= 0) throw new Error("FX rate missing");
        if (active) setConversionRate(rate);
      } catch { if (active) setConversionRate(null); }
    };
    void loadRate();
    return () => { active = false; };
  }, [accountCurrency, displayCurrency]);
  const displayMoney = (value: number | null) => {
    if (value == null) return "—";
    if (!accountCurrency) return money(value, displayCurrency);
    if (conversionRate == null) return money(value, accountCurrency);
    return money(value * conversionRate, displayCurrency);
  };
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

  const lastBeat = accountSnapshot.last_heartbeat ? new Date(accountSnapshot.last_heartbeat) : null;
  const heartbeatAge = lastBeat ? Date.now() - lastBeat.getTime() : Number.POSITIVE_INFINITY;
  const fresh = Boolean(
    accountSnapshot.status === "connected" && accountSnapshot.balance != null && Number.isFinite(heartbeatAge) && heartbeatAge >= 0 && heartbeatAge < 90_000,
  );
  const balance = fresh ? Number(accountSnapshot.balance) : null;
  const openTradeCount = fresh ? Number(accountSnapshot.open_trade_count ?? 0) : null;
  const pendingOrderCount = fresh ? Number(accountSnapshot.pending_order_count ?? 0) : null;
  const connectionLabel = fresh ? "MT5 connected" : accountSnapshot.last_heartbeat ? (heartbeatAge >= 0 && heartbeatAge < 120_000 ? "Connection stale" : "Disconnected") : "Waiting for MT5 data";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 pb-24">
      <div className={cn("flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5", fresh ? "border-primary/30 bg-primary/5" : "border-border bg-card/70")}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", fresh ? "bg-profit animate-pulse-dot" : "bg-muted-foreground")} />
          <div className="min-w-0">
            <p className="text-xs font-semibold">{fresh ? "Trade account connected" : connectionLabel}</p>
            <p className="text-[11px] text-muted-foreground">Robot {s.is_running ? "running" : "stopped"}{lastBeat ? ` · Updated ${lastBeat.toLocaleTimeString()}` : ""}</p>
          </div>
        </div>
        {!fresh && <Link to="/account" className="shrink-0 text-xs font-semibold text-primary hover:underline">Connect MT5</Link>}
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
      )}<section className="relative isolate overflow-hidden rounded-2xl border border-sky-400/30 bg-gradient-to-br from-[#071321] via-[#0b1c30] to-[#10172d] shadow-[0_18px_55px_-28px_rgba(14,165,233,.65)]">
        <div className="flex items-center justify-between border-b border-sky-300/15 bg-gradient-to-r from-sky-400/10 via-transparent to-violet-400/10 px-4 py-3">
          <div><p className="text-sm font-bold tracking-[0.18em] text-white">ACCOUNT SNAPSHOT</p><p className="text-[10px] uppercase tracking-wider text-slate-400">MOPSENTRY · MT5 TERMINAL</p></div>
          <span className={cn("rounded-md px-2 py-1 text-[10px] font-bold tracking-wider",fresh?"bg-emerald-400/10 text-emerald-400":"bg-slate-500/15 text-slate-400")}>{fresh?"CONNECTED":"OFFLINE"}</span>
        </div>
        <div className="border-b border-[#20364e] px-4 py-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACCOUNT BALANCE</p>
          <p className="num mt-2 text-2xl font-black text-white">{displayMoney(balance)}</p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-[#20364e]">
          <div className="px-4 py-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">OPEN TRADES</p><p className="num mt-2 text-2xl font-black text-sky-300">{openTradeCount ?? "—"}</p></div>
          <div className="px-4 py-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PENDING ORDERS</p><p className="num mt-2 text-2xl font-black text-violet-300">{pendingOrderCount ?? "—"}</p></div>
        </div>
      </section>

      <Button variant="outline" className="w-full justify-between rounded-xl border-cyan-400/25 bg-gradient-to-r from-cyan-500/10 to-blue-500/5 py-5" onClick={() => setBreakEvenDialogOpen(true)}><span className="flex items-center gap-2"><span className="text-cyan-300">⌁</span>Break-Even Protection</span><span className={cn("rounded-full px-3 py-1 text-[10px] font-bold",s.break_even_enabled?"bg-emerald-400/15 text-emerald-300":"bg-slate-500/15 text-slate-300")}>{s.break_even_enabled?"ON":"OFF"} · Configure</span></Button>












      <AlertDialog open={breakEvenDialogOpen} onOpenChange={setBreakEvenDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Break-Even Protection</AlertDialogTitle><AlertDialogDescription>Set your profit target and choose whether protection is on or off.</AlertDialogDescription></AlertDialogHeader>
          <label className="text-sm text-muted-foreground">Profit target · {accountCurrency ?? "account currency"}<input type="number" min="0.01" step="0.01" value={breakEvenTrigger} onChange={(event) => setBreakEvenTrigger(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground" /></label>
          <AlertDialogFooter><AlertDialogCancel disabled={breakEvenSave.isPending}>Cancel</AlertDialogCancel><Button disabled={breakEvenSave.isPending || !Number.isFinite(Number(breakEvenTrigger)) || Number(breakEvenTrigger)<=0} onClick={async()=>{await breakEvenSave.mutateAsync(!s.break_even_enabled);setBreakEvenDialogOpen(false);}}>{breakEvenSave.isPending?"Saving…":s.break_even_enabled?"Save & Turn Off":"Save & Turn On"}</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  );
}
