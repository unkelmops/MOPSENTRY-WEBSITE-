import type { SupabaseClient } from "@supabase/supabase-js";

export type DirectAccount = {
  id: string;
  broker_server: string;
  account_login: string;
  account_name: string | null;
  broker_name: string | null;
  account_currency: string | null;
  connection_status: string;
  access_mode: string;
  last_sync_at: string | null;
  created_at: string;
};

// Intentionally omit credentials, raw bridge errors and trading payloads.
const columns = "id,broker_server,account_login,account_name,broker_name,account_currency,connection_status,access_mode,last_sync_at,created_at";

export function pendingDirectAccount(userId: string, server: string, login: string) {
  const brokerServer = server.trim();
  const accountLogin = login.trim();
  if (!brokerServer || /[\r\n\u0000]/.test(brokerServer)) {
    throw new Error("Enter your broker's MT5 server name.");
  }
  if (!/^\d+$/.test(accountLogin)) {
    throw new Error("Enter an account login containing numbers only.");
  }
  if (!userId) throw new Error("Please sign in again.");
  return {
    user_id: userId,
    platform: "MT5",
    broker_server: brokerServer,
    account_login: accountLogin,
    access_mode: "investor",
    connection_status: "pending",
  };
}

export function directAccountStatus(account: Pick<DirectAccount, "connection_status" | "last_sync_at">, now = Date.now()) {
  const syncedAt = account.last_sync_at ? Date.parse(account.last_sync_at) : NaN;
  const hasSync = Number.isFinite(syncedAt) && syncedAt <= now;
  if (account.connection_status === "connected" && hasSync) {
    return { confirmed: true, label: "Connected · last reported by bridge" };
  }
  if (account.connection_status === "connected") {
    return { confirmed: false, label: "Awaiting bridge confirmation" };
  }
  if (!hasSync || account.connection_status === "pending") {
    return { confirmed: false, label: "Bridge setup required" };
  }
  return { confirmed: false, label: "Not connected · last reported by bridge" };
}

export class DirectAccountSignInRequired extends Error {
  constructor() { super("Please sign in again."); }
}

export function directAccountsApi(client: SupabaseClient) {
  async function owner() {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new DirectAccountSignInRequired();
    return data.user.id;
  }
  return {
    async list(): Promise<DirectAccount[]> {
      const userId = await owner();
      const { data, error } = await client.from("mt5_direct_connections")
        .select(columns).eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw new Error("Unable to load direct accounts. Check your connection and try again.");
      return (data ?? []) as DirectAccount[];
    },
    async create(server: string, login: string): Promise<void> {
      const payload = pendingDirectAccount(await owner(), server, login);
      const { error } = await client.from("mt5_direct_connections").insert(payload);
      if (error) throw new Error("Unable to save the account. Check your connection and account permissions, then try again.");
    },
    async remove(id: string): Promise<void> {
      const userId = await owner();
      const { data, error } = await client.from("mt5_direct_connections")
        .delete().eq("id", id).eq("user_id", userId).select("id");
      if (error || !data?.length) throw new Error("Unable to remove the account. Refresh and try again.");
    },
  };
}