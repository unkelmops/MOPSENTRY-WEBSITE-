import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function finite(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeTrades(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((trade: any) => {
    if (!trade || typeof trade !== "object" || typeof trade.symbol !== "string") return [];
    const side = trade.side === "SELL" || trade.type === "SELL" ? "SELL" : "BUY";
    const lots = finite(trade.lots ?? trade.volume);
    const open = finite(trade.open_price);
    const profit = finite(trade.profit);
    if (!lots || lots <= 0 || open === null || profit === null) return [];
    return [{
      symbol: trade.symbol.slice(0, 20),
      side,
      lots,
      open_price: open,
      profit,
      ...(Number.isSafeInteger(trade.ticket) && trade.ticket > 0 ? { ticket: trade.ticket } : {}),
      ...(finite(trade.current_price) !== null ? { current_price: finite(trade.current_price) } : {}),
    }];
  });
}

function normalizePending(value: unknown) {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(["BUY_LIMIT", "SELL_LIMIT", "BUY_STOP", "SELL_STOP", "BUY_STOP_LIMIT", "SELL_STOP_LIMIT"]);
  return value.slice(0, 100).flatMap((order: any) => {
    if (!order || typeof order !== "object" || typeof order.symbol !== "string" || !allowed.has(order.type)) return [];
    const volume = finite(order.volume);
    const entry = finite(order.entry_price);
    if (!volume || volume <= 0 || entry === null || !Number.isSafeInteger(order.ticket)) return [];
    return [{
      ticket: order.ticket,
      symbol: order.symbol.slice(0, 20),
      type: order.type,
      volume,
      entry_price: entry,
      ...(finite(order.sl) !== null ? { sl: finite(order.sl) } : {}),
      ...(finite(order.tp) !== null ? { tp: finite(order.tp) } : {}),
      ...(typeof order.expiration === "string" ? { expiration: order.expiration.slice(0, 64) } : {}),
    }];
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ ok: false, error: "server_configuration" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  const balance = finite(body?.balance);
  const equity = finite(body?.equity);
  if (typeof body?.key !== "string" || body.key.length < 12 || body.key.length > 80 ||
      balance === null || equity === null) {
    return json({ ok: false, error: "bad_input" }, 400);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date().toISOString();
  const { data: account, error: accountError } = await supabase
    .from("trading_accounts")
    .select("id,user_id")
    .eq("connection_key", body.key)
    .maybeSingle();
  if (accountError) return json({ ok: false, error: "account_lookup_failed" }, 500);
  if (!account) return json({ ok: false, error: "unknown_key" }, 401);

  const { error: updateError } = await supabase.from("trading_accounts").update({
    balance,
    equity,
    status: "connected",
    last_heartbeat: now,
    updated_at: now,
    ...(typeof body.login === "string" ? { login: body.login.slice(0, 32) } : {}),
    ...(typeof body.server === "string" ? { broker_server: body.server.slice(0, 100) } : {}),
    ...(typeof body.ea_version === "string" ? { ea_version: body.ea_version.slice(0, 20) } : {}),
    open_trades: normalizeTrades(body.open_trades),
    pending_orders: normalizePending(body.pending_orders),
  }).eq("id", account.id);
  if (updateError) return json({ ok: false, error: "status_update_failed" }, 500);

  const ack = body.last_command_result;
  if (ack && typeof ack.id === "string" && ["confirmed", "failed"].includes(ack.status)) {
    const patch = ack.status === "confirmed"
      ? { status: "confirmed", confirmed_at: now }
      : { status: "failed" };
    const { error } = await supabase.from("robot_commands").update(patch)
      .eq("id", ack.id).eq("user_id", account.user_id).eq("status", "pending");
    if (error) return json({ ok: false, error: "acknowledgement_failed" }, 500);
  }

  const expiry = new Date(Date.now() - 60_000).toISOString();
  const { error: expiryError } = await supabase.from("robot_commands").update({ status: "failed" })
    .eq("user_id", account.user_id).eq("status", "pending").lt("created_at", expiry);
  if (expiryError) return json({ ok: false, error: "command_cleanup_failed" }, 500);

  const { data: command, error: commandError } = await supabase.from("robot_commands")
    .select("id,command").eq("user_id", account.user_id).eq("status", "pending")
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (commandError) return json({ ok: false, error: "command_lookup_failed" }, 500);

  const { data: settings, error: settingsError } = await supabase.from("robot_settings")
    .select("is_running,strategy,timeframe,scalper_frequency,lot_size,risk_percent,max_trades,pairs,alerts_enabled")
    .eq("user_id", account.user_id).maybeSingle();
  if (settingsError) return json({ ok: false, error: "settings_lookup_failed" }, 500);

  const settingsPayload = {
    is_running: settings?.is_running ?? false,
    strategy: settings?.strategy ?? "trend",
    timeframe: settings?.timeframe ?? "M5",
    scalper_frequency: settings?.scalper_frequency ?? "standard",
    lot_size: settings?.lot_size ?? 0.10,
    risk_percent: settings?.risk_percent ?? 1.0,
    max_trades: settings?.max_trades ?? 5,
    pairs: Array.isArray(settings?.pairs) ? settings.pairs : ["XAUUSD"],
    alerts_enabled: settings?.alerts_enabled ?? true,
  };

  return json({
    ok: true,
    // Keep legacy top-level fields so older EA builds remain compatible.
    running: settingsPayload.is_running,
    strategy: settingsPayload.strategy,
    timeframe: settingsPayload.timeframe,
    scalper_frequency: settingsPayload.scalper_frequency,
    lot_size: settingsPayload.lot_size,
    risk_percent: settingsPayload.risk_percent,
    max_trades: settingsPayload.max_trades,
    pairs: settingsPayload.pairs,
    alerts_enabled: settingsPayload.alerts_enabled,
    // Structured settings contract for updated EA builds.
    settings: settingsPayload,
    pending_command_id: command?.id ?? "",
    pending_command_type: command?.command ?? "",
  });
});
