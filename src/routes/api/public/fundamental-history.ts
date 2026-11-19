import { createFileRoute } from "@tanstack/react-router";
import { getSeriesKey, type CalendarResponse } from "@/lib/fundamental-news";

export const Route = createFileRoute("/api/public/fundamental-history")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const lockCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
          const { data: syncLock, error: lockError } = await supabaseAdmin
            .from("fundamental_sync_state")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("id", "usd-high-impact")
            .lt("last_synced_at", lockCutoff)
            .select("id")
            .maybeSingle();
          if (lockError) {
            console.error("MOPSENTRY fundamental sync lock failed");
            return Response.json({ error: "history_sync_unavailable" }, { status: 500 });
          }

          if (syncLock) {
            const response = await fetch("https://showmytrades.com/api/public/calendar/v1?currency=USD&impact=high&days=30", {
              headers: { Accept: "application/json" },
            });
            if (!response.ok) {
              await supabaseAdmin.from("fundamental_sync_state").update({ last_synced_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() }).eq("id", "usd-high-impact");
              return Response.json({ error: "calendar_unavailable" }, { status: 502 });
            }
            const calendar = await response.json() as CalendarResponse;
            if (!Array.isArray(calendar.events)) {
              await supabaseAdmin.from("fundamental_sync_state").update({ last_synced_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() }).eq("id", "usd-high-impact");
              return Response.json({ error: "invalid_calendar_response" }, { status: 502 });
            }

            const now = new Date().toISOString();
            const rows = calendar.events.filter((event) => event.id && event.currency === "USD" && event.impact === "high")
              .map((event) => ({
                event_id: event.id!,
                series_key: getSeriesKey(event.id) ?? event.id!,
                currency: "USD",
                impact: event.impact,
                title: event.title,
                event_time: event.time,
                period: event.period || null,
                previous_value: event.previous || "",
                forecast_value: event.forecast || "",
                actual_value: event.actual || "",
                event_status: event.status || "scheduled",
                last_seen_at: now,
              }));

            if (rows.length) {
              const { error } = await supabaseAdmin.from("fundamental_event_history").upsert(rows, { onConflict: "event_id" });
              if (error) {
                console.error("MOPSENTRY fundamental history upsert failed");
                await supabaseAdmin.from("fundamental_sync_state").update({ last_synced_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() }).eq("id", "usd-high-impact");
                return Response.json({ error: "history_store_unavailable" }, { status: 500 });
              }
            }
          }

          const { data: syncState, error: syncStateError } = await supabaseAdmin.from("fundamental_sync_state").select("last_synced_at").eq("id", "usd-high-impact").maybeSingle();
          if (syncStateError) return Response.json({ error: "history_sync_state_unavailable" }, { status: 500 });

          const { data, error } = await supabaseAdmin.from("fundamental_event_history")
            .select("event_id,series_key,title,event_time,period,previous_value,forecast_value,actual_value,last_seen_at")
            .eq("currency", "USD")
            .order("event_time", { ascending: false })
            .limit(500);
          if (error) return Response.json({ error: "history_read_unavailable" }, { status: 500 });

          return Response.json({
            events: data ?? [],
            fetched_at: syncState?.last_synced_at ?? null,
            source: "ShowMyTrades economic calendar",
          }, { headers: { "Cache-Control": "private, max-age=60" } });
        } catch (error) {
          console.error("MOPSENTRY fundamental history endpoint failed", error);
          return Response.json({ error: "fundamental_history_unavailable" }, { status: 500 });
        }
      },
    },
  },
});