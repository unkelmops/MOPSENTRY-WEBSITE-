# MOPSENTRY Native iPhone App

This is the standalone React Native / Expo application. It is a real native app, not the website displayed inside a WebView. The native project is in `native-app/` and its source of truth is this repository: `unkelmops/mopsentry-bot`.

## Native screens

- **Overview** — account heartbeat, EA-reported balance/equity, positions and pending orders, break-even shortcut, currency display and account status.
- **Market Report** — shared XAUUSD, US30 and NAS100 market data, M5/M15/H1/H4 chart selection, quotes, candle chart, trend/structure, recent range and liquidity-sweep analysis. It uses the same Supabase market feed as the website; data availability depends on the shared provider/feed health.
- **Events** — high-impact USD calendar, upcoming and released events, SAST display, historical archive and fundamental outlook.
- **Signals** — USD news outlook, open trades and pending orders reported by the connected EA.
- **Robot Controls** — Trend / Scalper / Grid strategy, entry timeframe, higher timeframe, scalper frequency, lot size, risk, maximum trades, selected pairs, alerts, break-even protection, activity log, Start/Stop and Close All.
- **Account** — signed-in email, App Access, demo account details, connection status, connection-key reveal/copy/rotation, display currency and sign out.
- **VPS Packages** — Starter, Pro, Turbo, Boost and Super; 3-, 6- and 12-month terms; subscription and instance status. Checkout remains disabled until supplier and PayFast arrangements are verified.
- **Broker Connections / Direct Accounts** — connection-method information and pending read-only direct-account metadata. The separate Windows MT5 read-only bridge is not deployed; saving metadata does not connect an account.

The UI uses the MOPSENTRY dark-blue theme, brand header and animated ambient background. Screens show empty/unavailable states rather than inventing quotes, trades, candles or setups.

## Backend and security

The app connects directly to the existing MOPSENTRY Supabase project and uses Supabase Auth. Sessions are persisted with Expo SecureStore. The public client URL/key are configured through `.env`. Never put a Supabase service-role key, broker password, EA secret or other privileged credential in the app or GitHub.

Use an approved **demo login** for testing. Do not enter live broker passwords or API secrets. App Access and robot command safeguards remain enforced by the backend. This project does not require an App Store listing.

## Run on iPhone with Expo Go

From PowerShell on Windows:

```powershell
cd "$env:USERPROFILE\Documents\GitHub\mopsentry-bot\native-app"
Copy-Item .env.example .env
npm install
npx expo start
```

Open Expo Go on the iPhone and scan the QR code. If local network discovery fails:

```powershell
npx expo start --tunnel
```

## Install as a standalone iPhone app (no App Store)

The GitHub Actions workflow **Build MOPSENTRY iPhone IPA (unsigned)** generates an unsigned iPhone IPA artifact. An unsigned IPA cannot be installed by tapping it. Use AltStore, SideStore or another trusted sideloading tool to sign it with your own Apple ID and install it on your own device. Free Apple ID signing normally expires after seven days and must be refreshed. Keep Apple ID credentials private and enter them only into the sideloading tool.

Workflow and artifact: https://github.com/unkelmops/mopsentry-bot/actions

## Update local source

```powershell
cd "$env:USERPROFILE\Documents\GitHub\mopsentry-bot"
git pull origin main
cd native-app
npm install
npx expo start
```

GitHub is the source of truth. Pull the repository rather than copying individual files. The native app files are also mirrored into the website repository's `native-app/` folder to keep the two projects aligned.

## Automated validation

The Native app checks workflow runs:

- npm dependency installation
- TypeScript typecheck
- Expo Android bundle export

The iOS workflow separately runs Expo prebuild and Xcode to produce the unsigned IPA. A successful typecheck/export does not replace a real-device test.

## Still requires real-device / service verification

- Sign in, account creation and password-reset flow on the actual iPhone.
- Screen sizing, navigation, scrolling, and animation on the actual iPhone.
- Live shared market-feed freshness and event calendar updates.
- EA check-in, robot setting updates and Close All acknowledgement using a connected **demo** EA.
- Sideload signing and refresh on the user's own iPhone.

The direct MT5 read-only monitoring bridge is a separate not-yet-deployed service. Until that bridge exists and is independently security-reviewed, Direct Accounts is a pending metadata workflow, not a working broker connection. VPS checkout is intentionally disabled.
