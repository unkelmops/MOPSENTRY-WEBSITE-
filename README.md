# MOPSENTRY Website

This is the public, static website repository for MOPSENTRY.

- The main EA and backend source remain in the private `mopsentry-bot` repository.
- This repository is intended for the public website only.
- GitHub Pages deployment is defined in `.github/workflows/pages.yml`.
- No Supabase service-role key, database password, or private provider credential belongs in this repository.

## Current status

The first public launch page is static. The full authenticated MOPSENTRY application is not yet migrated here. The existing application uses server-side functionality that GitHub Pages does not run; it must be adapted to a static frontend and connected safely to the personal Supabase project before the dashboard and live market features can be launched here.
