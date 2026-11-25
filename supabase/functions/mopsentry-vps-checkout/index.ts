import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import CryptoJS from "npm:crypto-js@4.2.0";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("MOPSENTRY_SITE_URL") ?? "https://unkelmops.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function encode(value: string) {
  return encodeURIComponent(value.trim()).replace(/%[0-9a-f]{2}/gi, (v) => v.toUpperCase()).replace(/%20/g, "+");
}
function signature(fields: Record<string, string>, passphrase: string) {
  const body = Object.entries(fields).filter(([, value]) => value !== "").map(([key, value]) => `${key}=${encode(value)}`).join("&");
  const source = passphrase ? `${body}&passphrase=${encode(passphrase)}` : body;
  return CryptoJS.MD5(source).toString();
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Sign in before starting checkout." }, 401);
    const token = authHeader.slice(7);
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Your session has expired. Sign in again." }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: current, error: currentError } = await admin.from("vps_orders").select("id,status").eq("user_id", userData.user.id).in("status", ["pending_payment","paid","provisioning","active","past_due","suspended"]).limit(1).maybeSingle();
    if (currentError) throw currentError;
    if (current) return json({ error: "You already have a VPS subscription or an unfinished order. Contact MOPSENTRY support to continue." }, 409);

    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID");
    const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY");
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE");
    const siteUrl = Deno.env.get("MOPSENTRY_SITE_URL");
    if (!merchantId || !merchantKey || !passphrase || !siteUrl) return json({ error: "PayFast checkout is not configured yet." }, 503);

    const amountMinor = Number(Deno.env.get("VPS_MONTHLY_AMOUNT_MINOR") ?? "20000");
    if (!Number.isInteger(amountMinor) || amountMinor < 500) return json({ error: "The VPS package price is not configured correctly." }, 500);
    const amount = (amountMinor / 100).toFixed(2);
    const { data: order, error: orderError } = await admin.from("vps_orders").insert({
      user_id: userData.user.id, product_code: "managed_vps_monthly", amount_minor: amountMinor,
      currency: "ZAR", billing_interval: "month", status: "pending_payment", payment_provider: "payfast",
    }).select("id").single();
    if (orderError) throw orderError;

    const { error: transactionError } = await admin.from("vps_payment_transactions").insert({
      order_id: order.id, provider: "payfast", amount_minor: amountMinor, currency: "ZAR",
      status: "created", idempotency_key: `checkout:${order.id}`,
    });
    if (transactionError) {
      await admin.from("vps_orders").update({ status: "failed" }).eq("id", order.id);
      throw transactionError;
    }

    const sandbox = Deno.env.get("PAYFAST_SANDBOX") === "true";
    const base = sandbox ? "https://sandbox.payfast.co.za" : "https://www.payfast.co.za";
    const email = userData.user.email ?? "";
    if (!email) return json({ error: "Add an email address to your MOPSENTRY account before checkout." }, 400);
    const fields: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${siteUrl.replace(/\/$/, "")}/vps?payment=return`,
      cancel_url: `${siteUrl.replace(/\/$/, "")}/vps?payment=cancelled`,
      notify_url: `${url}/functions/v1/mopsentry-payfast-itn`,
      email_address: email,
      m_payment_id: order.id,
      amount,
      item_name: "MOPSENTRY Managed VPS",
      item_description: "Monthly Windows VPS hosting for one MT5 terminal",
      subscription_type: "1",
      billing_date: new Date().toISOString().slice(0, 10),
      recurring_amount: amount,
      frequency: "3",
      cycles: "0",
    };
    fields.signature = signature(fields, passphrase);
    return json({ action: `${base}/eng/process`, fields, order_id: order.id });
  } catch (error) {
    console.error("VPS checkout error", error);
    return json({ error: "Unable to start checkout. Please try again or contact support." }, 500);
  }
});
