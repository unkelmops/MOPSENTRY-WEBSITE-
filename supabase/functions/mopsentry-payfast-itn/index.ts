import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import CryptoJS from "npm:crypto-js@4.2.0";

function encode(value: string) {
  return encodeURIComponent(value.trim()).replace(/%[0-9a-f]{2}/gi, (v) => v.toUpperCase()).replace(/%20/g, "+");
}
function verifySignature(params: URLSearchParams, passphrase: string) {
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "signature" || value === "") continue;
    pairs.push(`${key}=${encode(value)}`);
  }
  const source = pairs.join("&") + (passphrase ? `&passphrase=${encode(passphrase)}` : "");
  return CryptoJS.MD5(source).toString() === (params.get("signature") ?? "").toLowerCase();
}
function text(body: string, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/plain" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return text("Method not allowed", 405);
  try {
    const raw = await req.text();
    const params = new URLSearchParams(raw);
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE");
    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID");
    if (!passphrase || !merchantId) return text("Payment verification is not configured", 503);
    if (!verifySignature(params, passphrase)) return text("Invalid signature", 400);
    if (params.get("merchant_id") !== merchantId) return text("Invalid merchant", 400);

    const sandbox = Deno.env.get("PAYFAST_SANDBOX") === "true";
    const validationUrl = sandbox
      ? "https://sandbox.payfast.co.za/eng/query/validate"
      : "https://www.payfast.co.za/eng/query/validate";
    const validation = await fetch(validationUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: raw,
    });
    if (!validation.ok || (await validation.text()).trim() !== "VALID") return text("PayFast validation failed", 400);

    const orderId = params.get("m_payment_id");
    const paymentId = params.get("pf_payment_id");
    const status = params.get("payment_status");
    const gross = Number(params.get("amount_gross") ?? params.get("amount"));
    if (!orderId || !paymentId || !Number.isFinite(gross)) return text("Missing payment reference", 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: order, error: orderError } = await admin.from("vps_orders").select("id,user_id,amount_minor,status").eq("id", orderId).maybeSingle();
    if (orderError || !order) return text("Unknown order", 404);
    if (Math.abs(Math.round(gross * 100) - order.amount_minor) > 1) return text("Payment amount mismatch", 400);

    const { error: eventError } = await admin.from("vps_payment_events").upsert({
      provider: "payfast", provider_event_id: paymentId, event_type: status ?? "UNKNOWN",
      payload: Object.fromEntries(params.entries()), processed_at: new Date().toISOString(),
    }, { onConflict: "provider,provider_event_id", ignoreDuplicates: true });
    if (eventError) throw eventError;

    if (status === "COMPLETE") {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      const subscriptionToken = params.get("token");
      const { error: txError } = await admin.from("vps_payment_transactions").upsert({
        order_id: order.id, provider: "payfast", provider_reference: paymentId,
        amount_minor: Math.round(gross * 100), currency: "ZAR", status: "paid",
        idempotency_key: `payfast:${paymentId}`, paid_at: now.toISOString(),
      }, { onConflict: "idempotency_key" });
      if (txError) throw txError;
      const { error: updateError } = await admin.from("vps_orders").update({
        status: "paid", provider_payment_id: paymentId, provider_subscription_token: subscriptionToken,
        current_period_start: now.toISOString(), current_period_end: periodEnd.toISOString(), updated_at: now.toISOString(),
      }).eq("id", order.id);
      if (updateError) throw updateError;
    } else if (status === "FAILED" || status === "CANCELLED") {
      const nextStatus = status === "FAILED" ? "past_due" : "cancelled";
      const { error: updateError } = await admin.from("vps_orders").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", order.id);
      if (updateError) throw updateError;
    }
    return text("OK");
  } catch (error) {
    console.error("PayFast ITN error", error);
    return text("Unable to process notification", 500);
  }
});
