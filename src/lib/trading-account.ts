import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TradingAccount = Database["public"]["Tables"]["trading_accounts"]["Row"];

export const tradingAccountQuery = queryOptions({
  queryKey: ["trading-account"],
  // Poll gently: each open screen previously hit the database every 2s.
  staleTime: 5_000,
  refetchInterval: 10_000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  queryFn: async (): Promise<TradingAccount> => {
    const { data: u } = await supabase.auth.getUser();
    const userId = u.user!.id;
    const { data, error } = await supabase
      .from("trading_accounts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
    const { data: created, error: insErr } = await supabase
      .from("trading_accounts")
      .insert({ user_id: userId })
      .select()
      .single();
    if (insErr) throw insErr;
    return created;
  },
});

export async function saveTradingAccount(
  patch: Partial<Pick<TradingAccount, "platform" | "broker_server" | "login">>,
) {
  const { data: u, error: authError } = await supabase.auth.getUser();
  if (authError || !u.user) throw new Error("Please sign in again.");
  const { error } = await supabase
    .from("trading_accounts")
    .update(patch)
    .eq("user_id", u.user.id);
  if (error) throw error;
}

function randomHex(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function generateConnectionKey() {
  // 80 bits of cryptographically secure randomness in a compact 20-character key.
  return randomHex(10);
}

export async function regenerateConnectionKey() {
  const { data, error } = await (supabase.rpc.bind(supabase) as unknown as (fn: string) => Promise<{ data: unknown; error: Error | null }>)("rotate_trading_account_key");
  if (error) throw error;
  if (typeof data !== "string" || !data) throw new Error("The new connection key was not returned.");
  return data;
}
