import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { higherTimeframeSchema, scalperFrequencySchema, timeframeSchema } from "./robot-options";

export type RobotSettings = Database["public"]["Tables"]["robot_settings"]["Row"] & {
  ny_open_entry_method: "breakout" | "immediate";
  ny_open_entry_offset_minutes: 0 | 1 | 2;
  ny_open_direction_filter: "htf" | "buy_only" | "sell_only";
  ny_open_range_minutes: number;
  ny_open_max_entries: number;
  ny_open_stop_loss_points: number;
  ny_open_take_profit_points: number;
  ny_open_basket_target: number;
  ny_open_daily_loss_limit: number;
  ny_open_entry_window_minutes: number;
};

export const robotSettingsQuery = queryOptions({
  queryKey: ["robot-settings"],
  queryFn: async (): Promise<RobotSettings> => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Please sign in again.");
    const userId = u.user.id;
    const { data, error } = await supabase
      .from("robot_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
    const { data: created, error: insErr } = await supabase
      .from("robot_settings")
      .insert({ user_id: userId })
      .select()
      .single();
    if (insErr) throw insErr;
    return created;
  },
});

export async function saveRobotSettings(patch: Partial<RobotSettings>) {
  if (patch.timeframe !== undefined) timeframeSchema.parse(patch.timeframe);
  if (patch.higher_timeframe !== undefined) higherTimeframeSchema.parse(patch.higher_timeframe);
  if (patch.break_even_trigger !== undefined && (!Number.isFinite(Number(patch.break_even_trigger)) || Number(patch.break_even_trigger) <= 0)) throw new Error("Break-even trigger must be greater than zero.");
  if (patch.scalper_frequency !== undefined) scalperFrequencySchema.parse(patch.scalper_frequency);
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Please sign in again.");
  const { error } = await supabase
    .from("robot_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", u.user.id);
  if (error) throw error;
}
