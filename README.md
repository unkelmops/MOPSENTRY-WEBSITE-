# MOPSENTRY Website

Public browser-facing frontend for MOPSENTRY.

## Architecture
- **Hosting:** GitHub Pages (static single-page application).
- **Frontend:** React + TanStack Start SPA mode + Tailwind.
- **Backend:** Personal Supabase project and authenticated Edge Functions.
- **EA services:** Remain in the private MOPSENTRY repository and Supabase. This repository does not contain the EA source, private server handlers, service-role keys, or database passwords.

## Local development
1. Install Bun.
2. Copy `.env.example` to `.env`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Run `bun install --frozen-lockfile`.
5. Run `bun run dev`.

## Build and tests
Run `bun run test` and `bun run build`.

The production build uses the GitHub Pages project base path `/MOPSENTRY-WEBSITE-/`. GitHub Pages serves the SPA shell and a 404 fallback so direct route visits can be handled by TanStack Router.

## Security
The browser uses only a Supabase publishable key. Publishable keys are designed for browser use; all database access must remain protected by Row Level Security. Never commit a Supabase secret/service-role key, broker password, private API token, or `.env` file.
