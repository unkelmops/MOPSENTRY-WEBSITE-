# MOPSENTRY mobile app foundation

## Current architecture

MOPSENTRY is a TanStack Start application with server-rendered routes and Supabase authentication. The mobile shell continues to use the hosted application and its existing server routes; it must not attempt to export the app as a static-only site.

## Capacitor shell

The Capacitor configuration points the native WebView at the published MOPSENTRY app:

- Hosted app: https://mopsentry-bot.lovable.app
- App identifier: `com.mopsentry.app`
- Display name: `MOPSENTRY`

This is a connected-shell build: the native Android/iOS container loads the hosted MOPSENTRY app. It is not an offline-first bundle, and it depends on the hosted app being available.

## Android test installation

The GitHub Actions workflow `.github/workflows/android-capacitor.yml` can build an installable Android debug APK:

1. Open the repository's **Actions** tab.
2. Select **Android Capacitor debug build**.
3. Select **Run workflow** and wait for the build to finish.
4. Open the completed run and download the `mopsentry-android-debug` artifact.
5. Extract the ZIP and install `app-debug.apk` on an Android test device.

This is a debug build for testing, not a Play Store release. A signed release build, application icon/splash assets, privacy disclosures, and Play Console setup are still required before publishing.

## iPhone testing and release

The GitHub Actions workflow `.github/workflows/ios-capacitor.yml` generates the Capacitor iOS project on a macOS runner and builds an unsigned iOS Simulator app. The artifact is for simulator testing and cannot be installed directly on a physical iPhone.

A physical iPhone build requires Apple signing and distribution, normally through an Apple Developer Program membership, App Store Connect, and TestFlight. Signing certificates and API keys must be stored as protected GitHub secrets, never committed to source.

For a quick check before a native build, open Safari on the iPhone, visit the hosted app, and use Share → Add to Home Screen. That creates a website shortcut, not a native Capacitor installation.

## Local setup

Install the Capacitor packages in the project, then initialise the native projects:

```bash
bun add @capacitor/core
bun add -d @capacitor/cli
bun add @capacitor/android @capacitor/ios
bunx cap add android
bunx cap add ios
bunx cap sync
```

Open native projects:

```bash
bunx cap open android
bunx cap open ios
```

Android builds require Android Studio and the Android SDK. iOS builds require macOS and Xcode.

## Important constraints

- Keep the TanStack Start server and Supabase backend hosted; do not treat a static export as a replacement for the server routes.
- The native container uses HTTPS to load the hosted app.
- The app must show empty/unavailable states when connected data is absent. Do not seed sample balances, positions, signals, or connection states.
- This mobile packaging work does not add or change EA execution, trading, or account-control behavior.
- A debug APK and an unsigned simulator build are testing artifacts, not public store releases.