# MOPSENTRY Native App

This is the separate React Native / Expo application. It is a real native app project, not a website displayed inside a WebView.

## Current native screens

- **Overview** — account heartbeat and EA-reported account metrics, Gold Market Pulse, and Trade Setup preview.
- **Market** — XAUUSD, US30 and NAS100 shared market data, M5/M15/H1/H4 chart timeframes, data-health indicators, and expandable analysis sections.
- **Events** — high-impact USD calendar, upcoming and released events, South African time display, historical release archive and fundamental outlook.
- **Signals** — USD news outlook, open trades and pending orders.
- **Robot** — robot status and guarded controls. Start requires server-side App Access and a fresh EA heartbeat; Close All requires a fresh heartbeat and confirmation.
- **Account** — signed-in email, App Access status, demo account details, connection status, connection-key reveal/copy/rotate and sign out.
- **Broker Connections / Direct Accounts** — secondary screens for connection-method information and pending read-only direct-account metadata. The Windows MT5 bridge is not deployed; saving metadata does not connect an account.

All screens use the shared MOPSENTRY dark-blue theme, logo header and animated ambient particle background. The app reads live backend data and displays empty/unavailable states rather than fabricating quotes, trades, candles or setups.

## Backend and security

The app uses the configured MOPSENTRY Supabase project and Supabase Auth. Sessions are persisted with Expo SecureStore. Public client credentials belong in `.env`; never put a service-role key, broker password, bridge secret or other privileged credential in the app or GitHub.

The committed `.env.example` contains the current project's public Supabase URL and publishable client key. Copy it to `.env` for local development. The local `.env` file is ignored by Git.

Use an approved **demo login** for testing. Do not enter live broker passwords or API secrets. App Access remains controlled by the backend. Do not enable access or connect a live trading account as part of this test.

## Run on your phone with Expo Go

You do not need to move individual source files to your PC. GitHub is the source of truth; clone or pull the repository.

### First setup on Windows

1. Install Node.js LTS and Git if they are not already installed.
2. Open PowerShell.
3. Run:

```powershell
git clone https://github.com/unkelmops/MOPSENTRY-WEBSITE-.git
cd MOPSENTRY-WEBSITE-\native-app
Copy-Item .env.example .env
npm install
npx expo start
```

4. Open Expo Go on your iPhone or Android phone and scan the QR code shown in PowerShell.
5. Sign in with the approved demo login.

If the phone cannot reach the development server over the local network, stop Expo with Ctrl+C and run:

```powershell
npx expo start --tunnel
```

### Updating after new changes

From PowerShell:

```powershell
cd MOPSENTRY-WEBSITE-
git pull origin main
cd native-app
npm install
npx expo start
```

Do not copy individual files from GitHub. Pulling the repository keeps source, logo, configuration and dependencies together.

### If npm runs out of memory

```powershell
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm install
```

## Validation already automated in GitHub

The Native app checks workflow runs:

- `npx expo install --check`
- `npx expo-doctor`
- `npm run typecheck`
- `npx expo export --platform android`
- `npx expo export --platform ios`

These checks validate dependencies, TypeScript and native JavaScript bundles. An Expo export is **not** a signed APK/IPA and does not replace testing on a real phone.

## What still requires device testing

- Sign in, sign up and password-reset email flow using the approved demo login.
- Screen layout, scrolling, bottom tabs and animated background on the actual iPhone/Android device.
- Market, event, EA heartbeat and account data against the configured backend.
- Expo Go compatibility and any device-specific issues.

The direct MT5 monitoring bridge is a separate not-yet-deployed service. Until that bridge exists and is independently security-reviewed, Direct Accounts remains a pending metadata workflow, not a working broker connection.
