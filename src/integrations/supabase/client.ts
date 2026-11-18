import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type SupabaseClient = ReturnType<typeof createClient<Database>>;
let client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("The MOPSENTRY Supabase client is only available in the browser.");
  }
  if (!client) {
    const url = import.meta.env["VITE_SUPABASE_URL"];
    const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) {
      throw new Error("MOPSENTRY is not configured. Missing Supabase public connection settings.");
    }
    client = createClient<Database>(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property, receiver) {
    return Reflect.get(getClient(), property, receiver);
  },
});
