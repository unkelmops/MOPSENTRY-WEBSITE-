import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, MonitorDown, PlugZap, RefreshCw, Server } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  regenerateConnectionKey,
  saveTradingAccount,
  tradingAccountQuery,
  type TradingAccount,
} from "@/lib/trading-account";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Connect account — MOPSENTRY EA" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tradingAccountQuery),
  component: Account,
});

const setupSteps = [
  {
    icon: Server,
    title: "We set up your VPS",
    text: "Your always-on Windows server is prepared for you — nothing to install yourself.",
  },
  {
    icon: MonitorDown,
    title: "MetaTrader + MOPSENTRY EA",
    text: "We log into your broker account and attach the robot to your charts.",
  },
  {
    icon: KeyRound,
    title: "Paste your connection key",
    text: "The key below goes into the EA's settings. It's the only thing that links the robot to this app.",
  },
  {
    icon: PlugZap,
    title: "You're live",
    text: "The moment the robot checks in, this page shows Connected and your real numbers start flowing in.",
  },
];

function Account() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(tradingAccountQuery);
  const [a, setA] = useState<TradingAccount>(data);
  const [copied, setCopied] = useState(false);
  const [keyRevealed, setKeyRevealed] = useState(false);

  const save = useMutation({
    mutationFn: (patch: Partial<TradingAccount>) => saveTradingAccount(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: tradingAccountQuery.queryKey }),
    onError: (e: Error) => toast.error(e.message),
  });

  const regen = useMutation({
    mutationFn: regenerateConnectionKey,
    onSuccess: (key) => {
      setA((prev) => ({ ...prev, connection_key: key, status: "pending" }));
      qc.invalidateQueries({ queryKey: tradingAccountQuery.queryKey });
      toast.success("New connection key created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(a.connection_key);
      setCopied(true);
      setKeyRevealed(false);
      toast.success("Connection key copied. It has been hidden again.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — long-press the key to copy it");
    }
  };


  return (
    <div className="space-y-5">
      {/* Account details */}
      <section className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-sm font-medium">Your broker account</p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {(["mt5", "mt4"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setA({ ...a, platform: p })}
              className={cn(
                "rounded-lg border py-2 text-sm font-semibold uppercase",
                a.platform === p ? "border-primary text-primary" : "text-muted-foreground",
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <Input
            placeholder="Broker server (e.g. Exness-MT5Real9)"
            value={a.broker_server}
            onChange={(e) => setA({ ...a, broker_server: e.target.value })}
          />
          <Input
            placeholder="Account login number"
            inputMode="numeric"
            value={a.login}
            onChange={(e) => setA({ ...a, login: e.target.value })}
          />
          <Button
            className="w-full"
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                { platform: a.platform, broker_server: a.broker_server, login: a.login },
                { onSuccess: () => toast.success("Account details saved") },
              )
            }
          >
            {save.isPending ? "Saving…" : "Save account details"}
          </Button>
        </div>
      </section>

      {/* Connection key */}
      <section className="rounded-xl border bg-card p-4">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-medium">Your connection key</p>
          <button
            onClick={() => regen.mutate()}
            disabled={regen.isPending}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", regen.isPending && "animate-spin")} />
            New key
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          This compact 20-character key links your EA to your MOPSENTRY account. Copy it into the EA settings and keep it private.
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-3">
          <span className="num min-w-0 flex-1 break-all text-base font-semibold tracking-widest text-primary">
            {keyRevealed ? a.connection_key : "••••••••••••••••••••"}
          </span>
          <Button type="button" variant="ghost" size="icon" aria-label={keyRevealed ? "Hide connection key" : "Reveal connection key"} onClick={() => { setKeyRevealed((v) => !v); setCopied(false); }}>
            {keyRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label="Copy connection key" onClick={copyKey}>
            {copied ? <Check className="h-4 w-4 text-profit" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Hidden by default. Copying does not delete or rotate the key; it is simply hidden again after copying.</p>
      </section>

      {/* How it works */}
      <section>
        <h2 className="mb-3 font-semibold">How connection works</h2>
        <div className="space-y-2">
          {setupSteps.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="flex gap-4 rounded-xl border bg-card p-4">
              <div className="flex flex-col items-center">
                <Icon className="h-5 w-5 shrink-0 text-primary" />
                {i < setupSteps.length - 1 && <div className="mt-2 w-px flex-1 bg-border" />}
              </div>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
