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

## Windows and Expo Go setup

The native app is separate from the website and uses Expo SDK 58.

### First setup

Open PowerShell and run:

```powershell
git clone https://github.com/unkelmops/MOPSENTRY-WEBSITE-.git
cd MOPSENTRY-WEBSITE-\native-app
Copy-Item .env.example .env
npm install
npx expo start
```

The supplied `.env.example` already points to the current MOPSENTRY Supabase project and uses its public client key. Keep the values in `.env` unless the project owner changes them. Never put a Supabase service-role key, broker password, or other server secret in this app.

When Expo shows the QR code:
1. Open Expo Go on your iPhone or Android phone.
2. Scan the QR code shown in PowerShell.
3. Wait for MOPSENTRY to load, then sign in with the approved demo login.

If the phone cannot reach the development server over the local network, stop Expo with Ctrl+C and run `npx expo start --tunnel`.

### Updating the app

If the repository is already cloned, open PowerShell in the repository root and run:

```powershell
git pull origin main
cd native-app
npm install
npx expo start
```

Do not copy source files individually. Pulling the repository keeps the app, logo, configuration and dependencies together.

### If npm runs out of memory

```powershell
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm install
```

### Safety

- Use the demo login for the first round of testing.
- Do not enter live broker passwords or API secrets.
- Robot controls remain subject to the backend's access and connection checks.
- The local `.env` file is ignored by Git and must never be committed or uploaded to the public repository.
