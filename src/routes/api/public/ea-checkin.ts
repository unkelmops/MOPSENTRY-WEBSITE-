import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { Database, Json } from "@/integrations/supabase/types";
import { eaSettingsPayload } from "@/lib/robot-options";

// Called by MOPSENTRY EA through MT5 WebRequest.
// The per-account connection key is the only credential accepted here.
const Trade = z
  .object({
    symbol: z.string().min(1).max(20),
    // Current EA payload uses type/volume; accept side/lots for older clients too.
    type: z.enum(["BUY", "SELL"]).optional(),
    side: z.enum(["BUY", "SELL"]).optional(),
    ticket: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    volume: z.number().positive().max(1000).optional(),
    lots: z.number().positive().max(1000).optional(),
    open_price: z.number().finite().min(-1e9).max(1e9),
    current_price: z.number().finite().min(-1e9).max(1e9).optional(),
    profit: z.number().finite().min(-1e9).max(1e9),
  })
  .refine((trade) => Boolean(trade.type ?? trade.side), {
    message: "Trade must include type or side",
  })
  .refine((trade) => (trade.volume ?? trade.lots ?? 0) > 0, {
    message: "Trade must include a positive volume or lots",
  });

const Body = z.object({
  key: z.string().regex(/^(?:MSE-[A-F0-9]{4,8}-[A-F0-9]{4,8}|MSE-[A-F0-9]{8}(?:-[A-F0-9]{8}){3})$/),
  balance: z.number().finite().min(-1e12).max(1e12),
  equity: z.number().finite().min(-1e12).max(1e12),
  login: z.string().max(32).optional(),
  server: z.string().max(100).optional(),
  ea_version: z.string().max(20).optional(),
  open_trades: z.array(Trade).max(100).optional(),
  pending_orders: z.array(z.object({
    ticket: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    symbol: z.string().min(1).max(20),
    type: z.enum(["BUY_LIMIT", "SELL_LIMIT", "BUY_STOP", "SELL_STOP", "BUY_STOP_LIMIT", "SELL_STOP_LIMIT"]),
    volume: z.number().positive().max(1000),
    entry_price: z.number().finite().min(-1e9).max(1e9),
    sl: z.number().finite().min(-1e9).max(1e9).optional(),
    tp: z.number().finite().min(-1e9).max(1e9).optional(),
    expiration: z.string().max(64).optional(),
  })).max(100).optional(),
  // Result of the last app-issued command, acknowledged by the EA on its next heartbeat.
  last_command_result: z.object({
    id: z.string().uuid(),
    status: z.enum(["confirmed", "failed"]),
  }).optional(),
});

export const Route = createFileRoute("/api/public/ea-checkin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = Body.safeParse(JSON.parse(await request.text()));
        } catch {
          return Response.json({ ok: false, error: "bad_json" }, { status: 400 });
        }
        if (!parsed.success) {
          return Response.json({ ok: false, error: "bad_input" }, { status: 400 });
        }

        const { key, balance, equity, login, server, ea_version, open_trades, pending_orders, last_command_result } = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date().toISOString();

        // Store trades in the app's established side/lots shape while retaining
        // ticket IDs from the current EA payload for future UI use.
        const normalizedTrades: Json[] | undefined = open_trades?.map((trade) => ({
          symbol: trade.symbol,
          side: trade.side ?? trade.type ?? "BUY",
          lots: trade.lots ?? trade.volume ?? 0,
          open_price: trade.open_price,
          profit: trade.profit,
          ...(trade.ticket !== undefined ? { ticket: trade.ticket } : {}),
          ...(trade.current_price !== undefined ? { current_price: trade.current_price } : {}),
        }));

        const normalizedPendingOrders: Json[] | undefined = pending_orders?.map((order) => ({
          ticket: order.ticket,
          symbol: order.symbol,
          type: order.type,
          volume: order.volume,
          entry_price: order.entry_price,
          ...(order.sl !== undefined ? { sl: order.sl } : {}),
          ...(order.tp !== undefined ? { tp: order.tp } : {}),
          ...(order.expiration ? { expiration: order.expiration } : {}),
        }));

        const patch: Database["public"]["Tables"]["trading_accounts"]["Update"] = {
          balance,
          equity,
          status: "connected",
          last_heartbeat: now,
          updated_at: now,
          ...(login ? { login } : {}),
          ...(server ? { broker_server: server } : {}),
          ...(ea_version ? { ea_version } : {}),
          ...(normalizedTrades ? { open_trades: normalizedTrades } : {}),
          ...(normalizedPendingOrders ? { pending_orders: normalizedPendingOrders } : {}),
        };

        const { data, error } = await supabaseAdmin
          .from("trading_accounts")
          .update(patch)
          .eq("connection_key", key)
          .select("id, user_id")
          .maybeSingle();

        if (error) {
          console.error("MOPSENTRY EA check-in update failed");
          return Response.json({ ok: false, error: "server" }, { status: 500 });
        }
        if (!data) return Response.json({ ok: false, error: "unknown_key" }, { status: 401 });

        // The EA acknowledges app-queued commands on the following heartbeat.
        // Match both command ID and owner so one account cannot acknowledge another user's command.
        if (last_command_result) {
          const acknowledgementPatch = last_command_result.status === "confirmed"
            ? { status: "confirmed", confirmed_at: now }
            : { status: "failed" };
          const { error: acknowledgementError } = await supabaseAdmin
            .from("robot_commands")
            .update(acknowledgementPatch)
            .eq("id", last_command_result.id)
            .eq("user_id", data.user_id)
            .eq("status", "pending");
          if (acknowledgementError) {
            console.error("MOPSENTRY EA command acknowledgement failed");
            return Response.json({ ok: false, error: "command_ack_failed" }, { status: 500 });
          }
        }

        // Expire Close All requests that were not collected by MT5 soon after
        // they were created, so an old queued request cannot fire unexpectedly
        // when the EA is reconnected much later.
        const commandExpiry = new Date(Date.now() - 60_000).toISOString();
        const { error: expiryError } = await supabaseAdmin
          .from("robot_commands")
          .update({ status: "failed" })
          .eq("user_id", data.user_id)
          .eq("status", "pending")
          .lt("created_at", commandExpiry);
        if (expiryError) {
          console.error("MOPSENTRY EA stale command cleanup failed");
          return Response.json({ ok: false, error: "command_cleanup_failed" }, { status: 500 });
        }

        const { data: pendingCommand, error: pendingCommandError } = await supabaseAdmin
          .from("robot_commands")
          .select("id, command")
          .eq("user_id", data.user_id)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (pendingCommandError) {
          console.error("MOPSENTRY EA pending command lookup failed");
          return Response.json({ ok: false, error: "command_lookup_failed" }, { status: 500 });
        }

        // Return the user's current controls plus one pending app command.
        const { data: settings, error: settingsError } = await supabaseAdmin
          .from("robot_settings")
          .select("is_running, strategy, timeframe, higher_timeframe, scalper_frequency, lot_size, risk_percent, max_trades, pairs, alerts_enabled, break_even_enabled, break_even_trigger")
          .eq("user_id", data.user_id)
          .maybeSingle();

        if (settingsError) {
          console.error("MOPSENTRY EA settings lookup failed");
          return Response.json({ ok: false, error: "settings_unavailable" }, { status: 500 });
        }

        return Response.json({
          ok: true,
          running: settings?.is_running ?? false,
          settings: settings ? eaSettingsPayload(settings) : null,
          // Flat fields are parsed by the lightweight JSON reader in the MQL5 EA.
          pending_command_id: pendingCommand?.id ?? "",
          pending_command_type: pendingCommand?.command ?? "",
        });
      },
    },
  },
});