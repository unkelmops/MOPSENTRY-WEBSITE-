# Testing MOPSENTRY on iPhone

## Test the current hosted app now

1. Open Safari on your iPhone.
2. Visit https://mopsentry-bot.lovable.app and sign in with your own test account.
3. Check the dashboard, navigation, theme picker, account page, and sign-out.
4. In Safari, tap Share, then **Add to Home Screen** for a home-screen shortcut.

This tests the hosted website in Safari, not the native Capacitor app.

## Native iOS build

The GitHub Actions workflow `.github/workflows/ios-capacitor.yml` generates the Capacitor iOS project on a macOS runner and builds an unsigned iOS Simulator app. The artifact is for simulator testing and cannot be installed directly on a physical iPhone.

## Physical iPhone installation

A physical-device build requires Apple signing and distribution. The normal route is an Apple Developer Program membership, app signing, an App Store Connect upload, and TestFlight. Apple certificates and API keys must be stored as protected GitHub secrets, never committed to source.

## Test checklist

- Sign-in, session persistence, and sign-out.
- Dashboard, navigation, and theme selection.
- Empty/unavailable states when no real data is connected.
- No fabricated balances, positions, signals, or connection states.

This is a hosted web app inside a native container at this stage. It does not change EA/backend execution behavior.