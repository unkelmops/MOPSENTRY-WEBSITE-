import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * App Access is manually granted by a trusted admin/service-role operation.
 * Checkout is intentionally not connected yet.
 */
export const appAccessQuery = queryOptions({
  queryKey: ["app-access"],
  queryFn: async (): Promise<boolean> => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error("Please sign in again.");
    const { data, error } = await supabase
      .from("app_access_entitlements")
      .select("enabled")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error) throw error;
    return data?.enabled === true;
  },
});
