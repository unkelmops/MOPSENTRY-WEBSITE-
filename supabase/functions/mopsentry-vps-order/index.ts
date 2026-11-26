import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const plans: Record<string, { name: string; monthly: number }> = {
  starter: { name: "STARTER", monthly: 189 },
  pro: { name: "PRO", monthly: 239 },
  turbo: { name: "TURBO", monthly: 299 },
  boost: { name: "BOOST", monthly: 799 },
  super: { name: "SUPER", monthly: 1269 },
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Please sign in to place a VPS order." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Order service is not configured." }, 500);

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(authHeader.slice(7));
  const user = authData.user;
  if (authError || !user?.id || !user.email) return json({ error: "Your session has expired. Please sign in again." }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid order details." }, 400); }
  const plan = plans[String(body.packageCode ?? "").toLowerCase()];
  const term = Number(body.termMonths);
  const customerName = String(body.customerName ?? "").trim().slice(0, 100);
  const customerPhone = String(body.customerPhone ?? "").trim().slice(0, 30);
  const customerNotes = String(body.customerNotes ?? "").trim().slice(0, 500);
  if (!plan || ![3, 6, 12].includes(term) || !customerName || !customerPhone) {
    return json({ error: "Choose a package and term, and enter your name and phone number." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const activeStatuses = ["request_received","under_review","awaiting_payment","payment_verified","pending_payment","paid","provisioning","active","past_due","suspended"];
  const { data: existing, error: existingError } = await admin.from("vps_orders")
    .select("id,order_reference,status").eq("user_id", user.id).in("status", activeStatuses).maybeSingle();
  if (existingError) return json({ error: "Unable to check your existing VPS orders." }, 500);
  if (existing) return json({ error: "You already have an open VPS order.", existingOrder: existing }, 409);

  const totalMinor = plan.monthly * term * 100;
  const { data: order, error: insertError } = await admin.from("vps_orders").insert({
    user_id: user.id, product_code: "managed_vps_monthly", amount_minor: totalMinor,
    currency: "ZAR", billing_interval: "month", status: "request_received",
    customer_email: user.email, customer_name: customerName, customer_phone: customerPhone,
    package_code: String(body.packageCode).toLowerCase(), package_name: plan.name,
    term_months: term, monthly_amount_minor: plan.monthly * 100,
    customer_notes: customerNotes || null, email_status: "not_configured",
  }).select("id,order_reference,status,amount_minor,currency,created_at,package_name,term_months").single();
  if (insertError || !order) {
    if (insertError?.code === "23505") return json({ error: "You already have an open VPS order. Refresh your VPS page to view it." }, 409);
    return json({ error: "We could not save your VPS order. Please try again." }, 500);
  }

  await admin.from("vps_order_events").insert({
    order_id: order.id, user_id: user.id, event_type: "order_received",
    from_status: null, to_status: "request_received",
    message: "Your VPS request was received. MOPSENTRY will review availability, confirm the final price and contact you manually.",
  });

  let emailStatus: "sent" | "failed" | "not_configured" = "not_configured";
  const endpoint = Deno.env.get("FORMSPREE_VPS_ENDPOINT");
  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          _subject: `MOPSENTRY VPS order ${order.order_reference}`,
          email: user.email, customer_name: customerName, customer_phone: customerPhone,
          order_reference: order.order_reference, package: plan.name, term_months: term,
          provisional_total: `R${(totalMinor / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
          status: "REQUEST RECEIVED — MANUAL REVIEW",
          notes: customerNotes || "None",
          payment_notice: "No payment was collected. MOPSENTRY must confirm availability, final pricing and fulfilment manually.",
        }),
        signal: AbortSignal.timeout(10000),
      });
      emailStatus = response.ok ? "sent" : "failed";
    } catch { emailStatus = "failed"; }
    await admin.from("vps_orders").update({ email_status: emailStatus }).eq("id", order.id);
  }

  return json({
    success: true,
    order: { ...order, email_status: emailStatus },
    message: "Your VPS order request has been recorded. No payment has been collected. MOPSENTRY will contact you to confirm availability and next steps.",
    emailStatus,
  }, 201);
});
