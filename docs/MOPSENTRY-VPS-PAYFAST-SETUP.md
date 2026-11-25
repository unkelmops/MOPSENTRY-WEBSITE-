# MOPSENTRY managed VPS + PayFast rollout

## Customer journey

1. Customer signs in to MOPSENTRY.
2. Customer opens **Settings → VPS subscription** (or the public `/vps` page).
3. The checkout Edge Function authenticates the Supabase user and creates a pending order at the server-controlled monthly price.
4. The customer is redirected to PayFast's hosted checkout to create a monthly card subscription.
5. PayFast sends an ITN to `mopsentry-payfast-itn`.
6. The ITN handler verifies the signature, merchant ID, PayFast server confirmation, order reference and exact expected amount before marking the order paid.
7. MOPSENTRY manually arranges the VPS with the hosting reseller until a reseller provisioning API and commercial agreement are confirmed.
8. Once the VPS is provisioned, an administrator updates the VPS assignment and order to active.

The browser cannot create or mark orders as paid. Supabase service-role access is restricted to the Edge Functions.

## Required Supabase Edge Function secrets

Set these in **Supabase Dashboard → Edge Functions → Secrets**. Never commit real values to GitHub or expose them in browser code.

- `PAYFAST_MERCHANT_ID` — PayFast merchant ID.
- `PAYFAST_MERCHANT_KEY` — PayFast merchant key.
- `PAYFAST_PASSPHRASE` — PayFast security passphrase (required for recurring billing).
- `PAYFAST_SANDBOX` — `true` for sandbox; `false` for live. If omitted, the functions default to sandbox.
- `VPS_CHECKOUT_ENABLED` — must be explicitly set to `true` to open checkout; keep it unset / `false` until reseller terms and retail pricing are approved.
- `MOPSENTRY_SITE_URL` — full HTTPS website base URL, without a trailing slash. For GitHub Pages use `https://unkelmops.github.io/MOPSENTRY-WEBSITE` (include the repository path). The function derives the CORS origin from this value.
- `VPS_MONTHLY_AMOUNT_MINOR` — amount in cents; current draft is `20000` (R200.00).
- Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions.

## PayFast account setup

1. Create and verify the PayFast merchant account.
2. In PayFast, set a security passphrase in Developer Settings.
3. Enable recurring subscriptions. PayFast recurring billing uses credit cards; other methods are not available for recurring subscriptions.
4. Use sandbox merchant credentials first. Create a sandbox recurring subscription and verify the ITN event and the Supabase order status.
5. Only after all sandbox tests pass and the reseller quote, retail price and customer terms are approved, switch the secrets to live merchant credentials, set `PAYFAST_SANDBOX=false`, then explicitly set `VPS_CHECKOUT_ENABLED=true`.

PayFast documentation: https://developers.payfast.co.za/docs

## Security / operational notes

- The return URL is not proof of payment. Only a verified PayFast ITN changes an order to paid.
- Never send PayFast secrets, Supabase service-role keys or VPS login passwords to the browser.
- Do not store VPS passwords in `vps_instances`; deliver credentials through a separately secured process.
- A paid order is not automatically a provisioned VPS. Manual provisioning remains the operational step until the reseller provides an approved API and reseller terms.
- The public price R200/month is a draft retail price, not a confirmed profit or wholesale cost.
- Confirm the reseller wholesale cost, minimum deposit/commitment, billing cadence, cancellation rules and customer support responsibility before accepting live customer payments.
- Confirm PayFast transaction fees and settlement timing before finalising margin projections.
