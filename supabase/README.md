# Personal Supabase backend

Project ref: `zykswpgxfmpjllnlivkd`

The owner has chosen a clean start. New users register again in personal Supabase Auth; no old Lovable user accounts or application records are being migrated.

## Included

- Supabase Auth with automatic profile provisioning for each new signup.
- `robot_settings`, `trading_accounts`, `robot_commands`, and `app_access_entitlements`.
- A secure `mopsentry-ea-checkin` Edge Function for EA heartbeat and command acknowledgement.
- The USD economic calendar cache used by the separate Signals screen.
- Row-level security and restricted EA telemetry writes.

New signups automatically receive a robot settings row, a trading account with a fresh connection key, and an App Access entitlement initially set to disabled. App Access must be granted by the administrator before Start is permitted.

## Removed

Macro Intelligence has been removed from the native app, website Signals screen, server routes, supporting analysis code, and personal Supabase tables. The separate Signals screen remains for economic-event bias, live trades and pending orders.

## Migration history

- `20261111103450_mopsentry_core_backend_foundation`
- `20261111103516_mopsentry_lock_down_legacy_ea_access`
- `20261111103710_mopsentry_authenticated_connection_key_rotation`
- `20261111103905_mopsentry_protect_ea_owned_account_fields`
- `20261111104710_remove_macro_intelligence_module`
- `20261111104737_restore_signals_calendar_without_macro_intelligence`
- `20261111105033_provision_new_mopsentry_auth_users`

## Cutover status

The Edge Function is deployed, but the running EA v1.73 still posts to the old Lovable-hosted `/api/public/ea-checkin` endpoint. The website and native app still need personal Supabase environment configuration. Do not switch the EA or disable the old backend until new-account signup, connection-key setup, heartbeat, Start/Stop, Close All, web and native app flows have passed tests.

Never put the Supabase service-role key in browser or `EXPO_PUBLIC_*` configuration.