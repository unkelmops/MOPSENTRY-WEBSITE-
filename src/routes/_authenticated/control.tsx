import { createFileRoute } from "@tanstack/react-router";
import { igniteApp } from "@/lib/ignite";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity, Bell, Check, ChevronRight, Cpu, Gauge, Layers3, Power,
  Radio, Save, ShieldCheck, SlidersHorizontal, Sparkles, Target, Waves,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ALL_PAIRS } from "@/lib/demo-data";
import { robotSettingsQuery, saveRobotSettings, type RobotSettings } from "@/lib/robot-settings";
import { appAccessQuery } from "@/lib/app-access";
import { tradingAccountQuery } from "@/lib/trading-account";
import { cn } from "@/lib/utils";
import { HIGHER_TIMEFRAMES, TIMEFRAMES } from "@/lib/robot-options";

export const Route = createFileRoute("/_authenticated/control")({
  head: () => ({ meta: [{ title: "Robot control — MOPSENTRY EA" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(robotSettingsQuery),
  component: Control,
});

const strategies = [
  {
    id: "trend",
    label: "Trend",
    description: "Fibonacci retracement entries with trend filtering and candle-close confirmation.",
    detail: "Waits for the signal candle to close in the intended direction.",
    orderComment: "MOPSENTRY - TREND",
    icon: Activity,
    tone: "cyan",
  },
  {
    id: "scalp",
    label: "Scalper",
    description: "A faster Fibonacci-based setup designed for more responsive entries.",
    detail: "Does not wait for an additional candle-close confirmation.",
    orderComment: "MOPSENTRY - SCALPER",
    icon: Waves,
    tone: "violet",
  },
  {
    id: "grid",
    label: "Grid",
    description: "Liquidity-sweep logic around previous swing levels.",
    detail: "Places pending orders only when the reclaim setup and trade cap allow it.",
    orderComment: "MOPSENTRY - GRID",
    icon: Layers3,
    tone: "amber",
  },
] as const;

function Control() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(robotSettingsQuery);
  const { data: hasAppAccess, isLoading: accessLoading } = useQuery(appAccessQuery);
  const { data: account } = useQuery(tradingAccountQuery);
  const [s, setS] = useState<RobotSettings>(data);
  const [savedSettings, setSavedSettings] = useState<RobotSettings>(data);
  const save = useMutation({
    mutationFn: async (patch: Partial<RobotSettings>) => {
      await saveRobotSettings(patch);
      return patch;
    },
    onSuccess: (patch) => {
      setSavedSettings((current) => ({ ...current, ...patch }));
      void qc.invalidateQueries({ queryKey: robotSettingsQuery.queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const settingsDirty =
    s.strategy !== savedSettings.strategy ||
    s.timeframe !== savedSettings.timeframe ||
    s.higher_timeframe !== savedSettings.higher_timeframe ||
    s.break_even_enabled !== savedSettings.break_even_enabled ||
    Number(s.break_even_trigger) !== Number(savedSettings.break_even_trigger) ||
    s.scalper_frequency !== savedSettings.scalper_frequency ||
    Number(s.lot_size) !== Number(savedSettings.lot_size) ||
    Number(s.risk_percent) !== Number(savedSettings.risk_percent) ||
    s.max_trades !== savedSettings.max_trades ||
    s.alerts_enabled !== savedSettings.alerts_enabled ||
    JSON.stringify(s.pairs) !== JSON.stringify(savedSettings.pairs);

  const heartbeatAt = account?.last_heartbeat ? new Date(account.last_heartbeat).getTime() : 0;
  const connectionReady = account?.status === "connected" && Number.isFinite(heartbeatAt) && Date.now() - heartbeatAt >= 0 && Date.now() - heartbeatAt < 30_000;
  const canStart = hasAppAccess === true && connectionReady;
  const selectedStrategy = strategies.find((st) => st.id === s.strategy) ?? strategies[0];

  const toggleRun = () => {
    const next = !s.is_running;
    if (next && settingsDirty) {
      toast.error("Save your settings first, then press Start.");
      return;
    }
    setS({ ...s, is_running: next });
    if (next) igniteApp();
    save.mutate({ is_running: next }, { onSuccess: () => toast.success(next ? "Robot started" : "Robot stopped") });
  };
  const togglePair = (p: string) =>
    setS({ ...s, pairs: s.pairs.includes(p) ? s.pairs.filter((x) => x !== p) : [...s.pairs, p] });

  const saveAll = () =>
    save.mutate(
      {
        strategy: s.strategy,
        timeframe: s.timeframe,
        higher_timeframe: s.higher_timeframe,
        scalper_frequency: s.scalper_frequency,
        lot_size: s.lot_size,
        risk_percent: s.risk_percent,
        max_trades: s.max_trades,
        pairs: s.pairs,
        alerts_enabled: s.alerts_enabled,
        break_even_enabled: s.break_even_enabled,
        break_even_trigger: s.break_even_trigger,
      },
      { onSuccess: () => toast.success("Settings saved. You can now press Start.") },
    );

  return (
    <div className="relative mx-auto max-w-6xl space-y-5 pb-6">
      <div className="pointer-events-none absolute -top-20 left-1/3 h-64 w-64 rounded-full bg-cyan-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute right-0 top-72 h-72 w-72 rounded-full bg-violet-500/[0.07] blur-[110px]" />

      <header className="relative overflow-hidden rounded-3xl border border-sky-400/20 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,.15),transparent_48%),radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,.13),transparent_48%),linear-gradient(135deg,hsl(var(--card)),rgba(7,16,33,.92))] p-5 shadow-[0_18px_65px_-35px_rgba(34,211,238,.45)] sm:p-6">
        <div className="absolute right-5 top-5 hidden h-24 w-24 items-center justify-center rounded-full border border-cyan-300/10 sm:flex">
          <div className="absolute inset-2 rounded-full border border-dashed border-violet-300/20" />
          <Cpu className="h-9 w-9 text-cyan-200/70" />
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.24em] text-cyan-300">
          <Sparkles className="h-3.5 w-3.5" /> MOPSENTRY / CONTROL DECK
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4 pr-0 sm:pr-28">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Robot control</h1>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Configure your strategy, execution parameters and protection settings from one command centre.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky-200">
            <span className="relative flex h-2 w-2"><span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60", s.is_running ? "animate-ping bg-emerald-400" : "bg-slate-400")} /><span className={cn("relative inline-flex h-2 w-2 rounded-full", s.is_running ? "bg-emerald-400" : "bg-slate-400")} /></span>
            {s.is_running ? "System active" : "System standby"}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          <Metric icon={Target} label="Strategy" value={selectedStrategy.label} />
          <Metric icon={Gauge} label="Entry TF" value={s.timeframe} />
          <Metric icon={Radio} label="HTF bias" value={s.higher_timeframe} />
        </div>
      </header>

      <section className={cn(
        "relative overflow-hidden rounded-2xl border p-4 transition-all sm:p-5",
        s.is_running
          ? "border-emerald-400/35 bg-gradient-to-r from-emerald-500/15 via-card to-cyan-500/10 shadow-[0_0_35px_-20px_rgba(52,211,153,.6)]"
          : "border-sky-300/20 bg-gradient-to-r from-sky-500/[0.09] via-card to-violet-500/[0.08]",
      )}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl border", s.is_running ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-300" : "border-sky-300/25 bg-sky-400/10 text-sky-200")}>
              <Power className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">Execution status</p>
              <p className="text-xl font-black">{s.is_running ? "Robot running" : "Robot stopped"}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {settingsDirty ? "Unsaved configuration changes" : "Configuration is up to date"}
              </p>
            </div>
          </div>
          <Button
            onClick={toggleRun}
            disabled={save.isPending || (!s.is_running && (settingsDirty || accessLoading || !canStart))}
            title={s.is_running ? "Stop MOPSENTRY" : hasAppAccess !== true ? "App Access is required to start." : !connectionReady ? "A fresh MT5/EA connection is required to start." : "Start MOPSENTRY"}
            className={cn(
              "h-12 min-w-36 rounded-xl px-6 font-bold tracking-wide shadow-lg transition-all",
              s.is_running
                ? "bg-rose-500 text-white shadow-rose-500/20 hover:bg-rose-600"
                : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/20 hover:brightness-110",
            )}
          >
            <Power className="mr-2 h-4 w-4" /> {s.is_running ? "STOP ROBOT" : "START ROBOT"}
          </Button>
        </div>
        <p className="mt-3 border-t border-white/[0.07] pt-3 text-[11px] leading-relaxed text-muted-foreground">
          {settingsDirty ? "Save your settings first, then start the robot." : "The EA receives saved settings at its next check-in."}
        </p>
        {!s.is_running && hasAppAccess !== true && !accessLoading && (
          <Notice title="App Access required">Your account does not currently have App Access enabled. Contact the MOPSENTRY administrator to have access granted.</Notice>
        )}
        {!s.is_running && hasAppAccess === true && !connectionReady && (
          <Notice title="MT5/EA connection required">Connect MT5 and wait for a fresh EA check-in before starting. This confirms the EA connection, not the VPS host itself.</Notice>
        )}
      </section>

      <div className="grid gap-3 xl:grid-cols-2">
        <Section title="Strategy engine" value={selectedStrategy.label} icon={Layers3} accent="violet" defaultOpen>
          <div className="grid grid-cols-3 gap-2">
            {strategies.map((st) => {
              const Icon = st.icon;
              const active = s.strategy === st.id;
              return (
                <button key={st.id} type="button" onClick={() => setS({ ...s, strategy: st.id })} aria-pressed={active}
                  className={cn(
                    "group relative min-h-[112px] overflow-hidden rounded-xl border p-3 text-left transition-all",
                    active
                      ? st.tone === "cyan" ? "border-cyan-300/50 bg-cyan-400/[0.12] shadow-[0_0_25px_-15px_rgba(34,211,238,.8)]"
                        : st.tone === "violet" ? "border-violet-300/50 bg-violet-400/[0.12] shadow-[0_0_25px_-15px_rgba(167,139,250,.8)]"
                        : "border-amber-300/50 bg-amber-400/[0.12] shadow-[0_0_25px_-15px_rgba(251,191,36,.7)]"
                      : "border-white/10 bg-black/10 hover:border-sky-300/30 hover:bg-sky-300/[0.04]",
                  )}>
                  <Icon className={cn("mb-3 h-5 w-5", st.tone === "cyan" ? "text-cyan-300" : st.tone === "violet" ? "text-violet-300" : "text-amber-300")} />
                  <span className="block text-xs font-bold">{st.label}</span>
                  <span className={cn("mt-1 block text-[9px] uppercase tracking-wider", active ? "text-sky-200" : "text-muted-foreground")}>{active ? "Selected" : "Select mode"}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 rounded-xl border border-violet-300/15 bg-gradient-to-r from-violet-400/[0.08] to-cyan-400/[0.04] p-3">
            <p className="text-xs font-semibold">{selectedStrategy.description}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{selectedStrategy.detail}</p>
            <p className="mt-2 font-mono text-[10px] text-cyan-300">{selectedStrategy.orderComment}</p>
          </div>
        </Section>

        <Section title="Timeframe matrix" value={`${s.timeframe} / ${s.higher_timeframe}`} icon={Activity} accent="cyan" defaultOpen>
          <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/[0.045] p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-cyan-200">Higher timeframe · HTF bias</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Independent trend filter</p>
              </div>
              <span className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[9px] font-bold tracking-wider text-cyan-200">HTF FILTER</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {HIGHER_TIMEFRAMES.map((timeframe) => (
                <TimeButton key={timeframe} active={s.higher_timeframe === timeframe} onClick={() => setS({ ...s, higher_timeframe: timeframe })} tone="cyan">{timeframe}</TimeButton>
              ))}
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-blue-300/15 bg-blue-400/[0.035] p-3">
            <p className="text-xs font-bold text-blue-200">Requested timeframe</p>
            <p className="mb-3 mt-0.5 text-[10px] text-muted-foreground">Entry / analysis timeframe · independent of HTF</p>
            <div className="grid grid-cols-4 gap-2">
              {TIMEFRAMES.map((timeframe) => (
                <TimeButton key={timeframe} active={s.timeframe === timeframe} onClick={() => setS({ ...s, timeframe })}>{timeframe}</TimeButton>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">Requested timeframe is saved and included in the EA check-in response. The current protocol does not report an applied-timeframe acknowledgement, so the app cannot confirm when the EA has applied it.</p>
        </Section>
      </div>

      {s.strategy === "scalp" && (
        <Section title="Scalper entry frequency" value={s.scalper_frequency} icon={Waves} accent="violet" defaultOpen>
          <div className="grid grid-cols-2 gap-2">
            {(["standard", "aggressive"] as const).map((frequency) => (
              <TimeButton key={frequency} active={s.scalper_frequency === frequency} onClick={() => setS({ ...s, scalper_frequency: frequency })}>
                <span className="capitalize">{frequency}</span>
              </TimeButton>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">{s.scalper_frequency === "aggressive" ? "More frequent entries · unchanged lot size, risk and trade cap." : "Standard entry frequency."} Requires support in your MT4/MT5 EA. More frequent entries can increase losses.</p>
        </Section>
      )}

      <Section title="Risk & execution" value={`${Number(s.lot_size).toFixed(2)} lots · ${Number(s.risk_percent).toFixed(1)}% risk`} icon={Gauge} accent="blue">
        <div className="grid gap-3 md:grid-cols-3">
          <SliderPanel title="Lot size" value={Number(s.lot_size).toFixed(2)} suffix="LOTS" min={0.01} max={1} step={0.01} current={Number(s.lot_size)} onChange={(v) => setS({ ...s, lot_size: v })} />
          <SliderPanel title="Risk per trade" value={`${Number(s.risk_percent).toFixed(1)}%`} suffix="RISK" min={0.1} max={5} step={0.1} current={Number(s.risk_percent)} onChange={(v) => setS({ ...s, risk_percent: v })} />
          <SliderPanel title="Maximum trades" value={String(s.max_trades)} suffix="TRADE CAP" min={1} max={20} step={1} current={s.max_trades} onChange={(v) => setS({ ...s, max_trades: v })} />
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">Maximum trades is the EA's total trade cap, not extra entries per setup. The EA must count its own open positions and pending orders for the symbol before placing a new order.</p>
      </Section>

      <Section title="Break-even protection" value={s.break_even_enabled ? `ON · ${Number(s.break_even_trigger).toFixed(2)}` : "OFF"} icon={ShieldCheck} accent="emerald">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.045] p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><ShieldCheck className="h-5 w-5" /></div>
            <div><p className="text-xs font-bold">Enable break-even</p><p className="mt-0.5 text-[10px] text-muted-foreground">Move stop loss to entry at the profit trigger.</p></div>
          </div>
          <Switch checked={s.break_even_enabled} onCheckedChange={(enabled) => setS({ ...s, break_even_enabled: enabled })} />
        </div>
        {s.break_even_enabled && (
          <div className="mt-4 rounded-xl border border-emerald-300/15 bg-black/10 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div><p className="text-xs font-bold">Floating-profit trigger</p><p className="text-[10px] text-muted-foreground">Profit amount required before moving to break-even</p></div>
              <span className="num rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-sm font-bold text-emerald-200">{Number(s.break_even_trigger).toFixed(2)}</span>
            </div>
            <Slider min={1} max={1000} step={1} value={[Number(s.break_even_trigger)]} onValueChange={([v]) => setS({ ...s, break_even_trigger: v ?? 1 })} />
          </div>
        )}
      </Section>

      <div className="grid gap-3 xl:grid-cols-[1.4fr_.6fr]">
        <Section title="Trading instruments" value={`${s.pairs.length} selected`} icon={Target} accent="cyan">
          <div className="flex flex-wrap gap-2">
            {ALL_PAIRS.map((p) => (
              <button key={p} type="button" onClick={() => togglePair(p)} aria-pressed={s.pairs.includes(p)}
                className={cn("num rounded-lg border px-3 py-2 text-[11px] font-semibold transition-all",
                  s.pairs.includes(p) ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200 shadow-[0_0_18px_-12px_rgba(34,211,238,.8)]" : "border-white/10 bg-black/10 text-muted-foreground hover:border-cyan-300/25")}>
                {s.pairs.includes(p) && <Check className="mr-1 inline h-3 w-3" />}{p}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Signal alerts" value={s.alerts_enabled ? "ENABLED" : "MUTED"} icon={Bell} accent="violet">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-300/15 bg-violet-400/[0.05] p-3">
            <div><p className="text-xs font-bold">Trading notifications</p><p className="mt-0.5 text-[10px] text-muted-foreground">Receive signal alerts from MOPSENTRY.</p></div>
            <Switch checked={s.alerts_enabled} onCheckedChange={(v) => setS({ ...s, alerts_enabled: v })} />
          </div>
        </Section>
      </div>

      <div className="sticky bottom-3 z-20 rounded-2xl border border-sky-300/20 bg-slate-950/90 p-3 shadow-[0_15px_45px_-20px_rgba(34,211,238,.35)] backdrop-blur-xl sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={cn("grid h-9 w-9 place-items-center rounded-xl", settingsDirty ? "bg-amber-400/10 text-amber-300" : "bg-emerald-400/10 text-emerald-300")}>
              {settingsDirty ? <SlidersHorizontal className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            </div>
            <div><p className="text-xs font-bold">{settingsDirty ? "Unsaved changes" : "All settings saved"}</p><p className="text-[10px] text-muted-foreground">{settingsDirty ? "Save before starting the robot" : "Ready when your MT5 connection is online"}</p></div>
          </div>
          <Button onClick={saveAll} disabled={save.isPending || !settingsDirty} className="h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 font-bold text-white shadow-lg shadow-cyan-500/15 hover:brightness-110">
            {save.isPending ? <><Activity className="mr-2 h-4 w-4 animate-pulse" /> Saving…</> : <><Save className="mr-2 h-4 w-4" /> Save settings</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/15 px-3 py-2.5 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"><Icon className="h-3 w-3 text-cyan-300" />{label}</div>
      <p className="mt-1 truncate text-sm font-black text-foreground sm:text-base">{value}</p>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-[11px] leading-relaxed text-muted-foreground"><p className="mb-1 font-bold text-amber-200">{title}</p>{children}</div>;
}

function TimeButton({ active, onClick, children, tone = "blue" }: { active: boolean; onClick: () => void; children: React.ReactNode; tone?: "blue" | "cyan" }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn("rounded-lg border px-2 py-2 text-xs font-bold transition-all",
        active
          ? tone === "cyan" ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100 shadow-[0_0_18px_-10px_rgba(34,211,238,.9)]" : "border-blue-300/40 bg-blue-300/10 text-blue-100"
          : "border-white/10 bg-black/10 text-muted-foreground hover:border-sky-300/30 hover:text-foreground")}>
      {children}
    </button>
  );
}

function SliderPanel({ title, value, suffix, min, max, step, current, onChange }: {
  title: string; value: string; suffix: string; min: number; max: number; step: number; current: number; onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-xl border border-sky-300/15 bg-gradient-to-br from-sky-400/[0.06] to-violet-400/[0.035] p-3">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div><p className="text-xs font-bold">{title}</p><p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{suffix}</p></div>
        <span className="num rounded-lg border border-sky-300/20 bg-sky-300/10 px-2 py-1 text-sm font-black text-sky-100">{value}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[current]} onValueChange={([v]) => onChange(v ?? min)} />
    </div>
  );
}

function Section({ title, value, children, icon: Icon, accent = "cyan", defaultOpen = false }: {
  title: string; value?: string; children: React.ReactNode; icon: React.ElementType; accent?: "cyan" | "violet" | "blue" | "emerald"; defaultOpen?: boolean;
}) {
  const accents = {
    cyan: "border-cyan-300/20 group-open:border-cyan-300/40 text-cyan-200",
    violet: "border-violet-300/20 group-open:border-violet-300/40 text-violet-200",
    blue: "border-blue-300/20 group-open:border-blue-300/40 text-blue-200",
    emerald: "border-emerald-300/20 group-open:border-emerald-300/40 text-emerald-200",
  };
  return (
    <details open={defaultOpen} className={cn("group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-slate-950/55 shadow-[0_12px_38px_-30px_rgba(56,189,248,.65)] transition-all", accents[accent])}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl border bg-white/[0.025]", accents[accent])}><Icon className="h-4 w-4" /></span>
          <span className="min-w-0"><span className="block truncate text-xs font-bold text-foreground">{title}</span><span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[.14em] text-muted-foreground">Configuration module</span></span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {value && <span className="num max-w-[145px] truncate rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-foreground">{value}</span>}
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
        </span>
      </summary>
      <div className="border-t border-white/[0.07] bg-gradient-to-br from-white/[0.025] to-transparent px-4 pb-4 pt-3">{children}</div>
    </details>
  );
}
