# MOPSENTRY Website

Public browser-facing frontend for MOPSENTRY.

## Architecture
- **Hosting:** GitHub Pages (static single-page application).
- **Frontend:** React + TanStack Start SPA mode + Tailwind.
- **Backend:** Personal Supabase project and authenticated Edge Functions.
- **Native app:** The Expo/React Native project lives in `native-app/` and has its own package and setup instructions.
- **Auth routing:** Web and native redirects are deferred until Supabase auth callbacks finish, avoiding nested auth-lock requests.
- **EA services:** Remain in the private MOPSENTRY repository and Supabase. This repository does not contain the EA source, service-role keys, or database passwords.

## Local development
1. Install Bun.
2. Copy `.env.example` to `.env`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Run `bun install --frozen-lockfile`.
5. Run `bun run dev`.

For the Expo app, follow `native-app/README.md` and use its separate `.env.example`.

## Build and tests
Run `bun run test` and `bun run build`.

The production build uses the GitHub Pages project base path `/MOPSENTRY-WEBSITE-/`. GitHub Pages serves the SPA shell and a 404 fallback so direct route visits can be handled by TanStack Router.

## Backend deployment note
Supabase Edge Function and server-route source is included for project completeness. GitHub Pages only hosts static files; it does not run TanStack server/API routes. Deploy Edge Functions to Supabase and any server-only routes to a supported server host.

## Security
The browser uses only a Supabase publishable key. Publishable keys are designed for browser use; all database access must remain protected by Row Level Security. Never commit a Supabase secret/service-role key, broker password, private API token, or `.env` file.
