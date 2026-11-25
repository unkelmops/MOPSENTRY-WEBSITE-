import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export type ActivityStatus = "saved" | "queued" | "acknowledged" | "failed" | "info";

export async function recordActivity(
  eventType: string,
  status: ActivityStatus,
  message: string,
  details: Record<string, unknown> = {},
) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const { error } = await supabase.from("mopsentry_activity_log").insert({
    user_id: data.user.id,
    event_type: eventType,
    status,
    message,
    details: details as Json,
  });
  if (error) console.warn("MOPSENTRY activity log write failed:", error.message);
}
