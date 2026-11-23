import { createFileRoute } from "@tanstack/react-router";
import { igniteApp } from "@/lib/ignite";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ALL_PAIRS } from "@/lib/demo-data";
import { robotSettingsQuery, saveRobotSettings, type RobotSettings } from "@/lib/robot-settings";
import { appAccessQuery } from "@/lib/app-access";
import { tradingAccountQuery } from "@/lib/trading-account";
import { cn } from "@/lib/utils";
import { TIMEFRAMES } from "@/lib/robot-options";

export const Route = createFileRoute("/_authenticated/control")({
  head: () => ({ meta: [{ title: "Robot control — MOPSENTRY EA" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(robotSettingsQuery),
  component: Control,
});

const strategies = [
  {
    id: "trend",
    label: "Trend",
    description:
      "Uses the existing Fibonacci retracement setup with the trend filter and price action. It waits for the signal candle to close in the intended direction before entering.",
    orderComment: "MOPSENTRY - TREND",
  },
  {
    id: "scalp",
    label: "Scalper",
    description:
      "Uses the faster Fibonacci-based setup. It does not wait for an additional candle-close confirmation, so entries can happen sooner.",
    orderComment: "MOPSENTRY - SCALPER",
  },
  {
    id: "grid",
    label: "Grid",
    description:
      "Looks for a liquidity sweep around a previous swing level, then a reclaim or move back inside the level. The EA should place pending orders around that level only when the setup and trade limit allow it.",
    orderComment: "MOPSENTRY - GRID",
  },
] as const;

function Control() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(robotSettingsQuery);
  const { data: hasAppAccess, isLoading: accessLoading } = useQuery(appAccessQuery);
  const { data: account } = useQuery(tradingAccountQuery);
  const [s, setS] = useState<RobotSettings>(data);
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
  const [savedSettings, setSavedSettings] = useState<RobotSettings>(data);
  const settingsDirty =
    s.strategy !== savedSettings.strategy ||
    s.timeframe !== savedSettings.timeframe ||
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

  return (
    <div className="space-y-5">
      <button
        onClick={toggleRun}
        disabled={save.isPending || (!s.is_running && (settingsDirty || accessLoading || !canStart))}
        title={s.is_running ? "Stop MOPSENTRY" : hasAppAccess !== true ? "App Access is required to start." : !connectionReady ? "A fresh MT5/EA connection is required to start." : "Start MOPSENTRY"}
        className={cn(
          "flex w-full items-center justify-between rounded-2xl border p-5 transition-colors",
          s.is_running ? "border-primary bg-primary text-primary-foreground shadow-glow" : "bg-card",
        )}
      >
        <div className="text-left">
          <p className="text-sm opacity-80">Robot status</p>
          <p className="text-2xl font-bold">{s.is_running ? "Running" : "Stopped"}</p>
        </div>
        <Power className="h-10 w-10" />
      </button>
      <p className="-mt-3 text-xs text-muted-foreground">
        {settingsDirty ? "You have unsaved changes. Save settings before starting." : "Settings are saved. Press Start when you're ready."} The EA receives saved settings at its next check-in.
      </p>
      {!s.is_running && hasAppAccess !== true && !accessLoading && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">App Access required</p>
          Your account does not currently have App Access enabled. Contact the MOPSENTRY administrator to have access granted.
        </div>
      )}
      {!s.is_running && hasAppAccess === true && !connectionReady && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">MT5/EA connection required</p>
          Connect MT5 and wait for a fresh EA check-in before starting. This confirms the EA connection, not the VPS host itself.
        </div>
      )}

      <Section title="Strategy" value={selectedStrategy.label}>
        <div className="grid grid-cols-3 gap-2">
          {strategies.map((st, index) => (
            <button key={st.id} type="button" onClick={() => setS({ ...s, strategy: st.id })} aria-pressed={s.strategy === st.id}
              className={cn("group relative min-h-[88px] overflow-hidden rounded-xl border p-3 text-left transition-all",
                s.strategy === st.id ? "border-sky-300/60 bg-gradient-to-br from-sky-400/20 via-blue-500/10 to-violet-500/15 shadow-[0_8px_28px_-16px_rgba(56,189,248,.8)]" : "border-border bg-gradient-to-br from-card to-muted/50 hover:border-sky-300/35")}>
              <span className={cn("mb-3 grid h-8 w-8 place-items-center rounded-lg text-sm font-black",index===0?"bg-cyan-300/15 text-cyan-300":index===1?"bg-violet-300/15 text-violet-300":"bg-amber-300/15 text-amber-300")}>{index===0?"↗":index===1?"ϟ":"⌘"}</span>
              <span className="block text-xs font-bold">{st.label}</span>
              <span className={cn("mt-1 block text-[9px] uppercase tracking-wider",s.strategy===st.id?"text-sky-200":"text-muted-foreground")}>{s.strategy===st.id?"Selected":"Choose"}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-sky-300/20 bg-gradient-to-r from-sky-400/10 via-card to-violet-400/5 p-3">
          <p className="text-sm font-semibold">{selectedStrategy.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{selectedStrategy.description}</p>
          <p className="mt-2 font-mono text-[10px] text-sky-300">{selectedStrategy.orderComment}</p>
        </div>
      </Section>

      <Section title="Requested timeframe" value={s.timeframe}>
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">This preference is saved and included in the EA check-in response. The app cannot confirm that the EA has applied it because the current check-in protocol does not report an applied-timeframe acknowledgement. Treat it as pending until EA-side acknowledgement is added and verified.</p>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Requested trading timeframe">
          {TIMEFRAMES.map((timeframe) => (
            <Button key={timeframe} variant="outline" aria-pressed={s.timeframe === timeframe} onClick={() => setS({ ...s, timeframe })} className={cn("num px-2", s.timeframe === timeframe && "border-primary bg-primary/10 text-primary")}>
              {timeframe}
            </Button>
          ))}
        </div>
      </Section>

      {s.strategy === "scalp" && (
        <Section title="Scalper entry frequency">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Scalper entry frequency">
            {(["standard", "aggressive"] as const).map((frequency) => (
              <Button key={frequency} variant="outline" aria-pressed={s.scalper_frequency === frequency} onClick={() => setS({ ...s, scalper_frequency: frequency })} className={cn("capitalize", s.scalper_frequency === frequency && "border-primary bg-primary/10 text-primary")}>
                {frequency}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{s.scalper_frequency === "aggressive" ? "More frequent entries · unchanged lot size, risk and trade cap." : "Standard entry frequency."}</p>
          <p className="mt-2 text-xs text-muted-foreground">Requires support in your MT4/MT5 EA. More frequent entries can increase losses.</p>
        </Section>
      )}

      <Section title="Lot size" value={Number(s.lot_size).toFixed(2)}>
        <Slider min={0.01} max={1} step={0.01} value={[Number(s.lot_size)]} onValueChange={([v]) => setS({ ...s, lot_size: v ?? 0 })} />
      </Section>
      <Section title="Risk per trade" value={`${Number(s.risk_percent).toFixed(1)}%`}>
        <Slider min={0.1} max={5} step={0.1} value={[Number(s.risk_percent)]} onValueChange={([v]) => setS({ ...s, risk_percent: v ?? 0 })} />
      </Section>
      <Section title="Maximum trades" value={String(s.max_trades)}>
        <Slider min={1} max={20} step={1} value={[s.max_trades]} onValueChange={([v]) => setS({ ...s, max_trades: v ?? 0 })} />
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          This is the EA's total trade cap, not an extra number of entries per setup. The EA must check its own open positions and pending orders for the symbol before placing any new order.
        </p>
      </Section>

      <Section title="Pairs">
        <div className="flex flex-wrap gap-2">
          {ALL_PAIRS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePair(p)}
              aria-pressed={s.pairs.includes(p)}
              className={cn(
                "num rounded-full border px-3 py-1 text-xs",
                s.pairs.includes(p) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </Section>

      <div className="flex items-center justify-between rounded-xl border bg-card p-4">
        <span className="text-sm font-medium">Signal alerts</span>
        <Switch checked={s.alerts_enabled} onCheckedChange={(v) => setS({ ...s, alerts_enabled: v })} />
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={save.isPending || !settingsDirty}
        onClick={() =>
          save.mutate(
            { strategy: s.strategy, timeframe: s.timeframe, scalper_frequency: s.scalper_frequency, lot_size: s.lot_size, risk_percent: s.risk_percent, max_trades: s.max_trades, pairs: s.pairs, alerts_enabled: s.alerts_enabled },
            { onSuccess: () => toast.success("Settings saved. You can now press Start.") },
          )
        }
      >
        {save.isPending ? "Saving…" : settingsDirty ? "Save settings" : "Settings saved"}
      </Button>
    </div>
  );
}

function Section({ title, value, children }: { title: string; value?: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm [&::-webkit-details-marker]:hidden">
        <span className="font-medium">{title}</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {value && <span className="num text-primary">{value}</span>}
          <span className="text-xs transition-transform group-open:rotate-180">⌄</span>
        </span>
      </summary>
      <div className="border-t px-4 pb-4 pt-3">{children}</div>
    </details>
  );
}
