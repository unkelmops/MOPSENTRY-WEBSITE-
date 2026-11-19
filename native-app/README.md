# MOPSENTRY Native

This is the separate React Native / Expo application. It does not load the website in a WebView.

## Configure

1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_SUPABASE_URL` to the personal MOPSENTRY Supabase project URL.
3. Set `EXPO_PUBLIC_SUPABASE_ANON_KEY` to that project's publishable/anon key. Never put a service-role key in this app.
4. Run `npm install`, then `npx expo start`.

## Current app

- Overview → Connect MT5 Account opens independent direct-account monitoring setup.
- Direct accounts use the existing native authenticated client and `public.mt5_direct_connections` owner policies. Only broker server, numeric account login, MT5 platform, investor access and pending status are submitted.
- Users can list and remove their own saved direct records. No password, trade command or EA-table change is involved.
- A connected label requires both a bridge-reported connected status and a valid past sync timestamp; it describes the last report, not guaranteed current availability.

## Direct MT5 bridge still required

The Windows bridge is not deployed by this change. It must independently provide investor-only MT5 monitoring, secure credential handoff/storage outside the app database, trusted owner-to-bridge mapping, and telemetry/status updates. The app currently saves pending metadata only. Do not put broker passwords, bridge tokens or privileged keys in this app or its database.

Validation: from the repository root run `bunx vitest run src/test/direct-mt5.test.ts` and `bunx tsgo --project native-app/tsconfig.json --noEmit`; from `native-app` run `bunx expo export --platform android`. Export produces an Android bundle, not a signed installable APK. Real authenticated create/list/delete checks require a session in the native app's configured backend; managed web-preview sessions belong to a different backend and must not be reused.

- Native email/password sign-in and sign-up using Supabase Auth.
- Secure session persistence using Expo SecureStore.
- Account overview with real MT5 balance, equity, heartbeat, open positions and pending orders.
- Robot controls for Start, Stop and Close All, with server-side App Access and fresh-heartbeat checks.
- Account status and live EA telemetry; connection-key setup is handled in the website account page.
- No demo telemetry or placeholder trading data.
- Economic-event Signals, live trades and pending-order views.
- Macro Intelligence has been removed from the app and backend.
- New signups automatically receive a trading-account profile and fresh EA connection key; App Access must be enabled separately by an administrator.

Never expose a Supabase service-role key in browser or `EXPO_PUBLIC_*` variables. The EA heartbeat endpoint uses a server-side secret.