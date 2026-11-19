<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture

- Native direct MT5 monitoring uses the existing native authenticated client and only `mt5_direct_connections`; keep its metadata-only create/delete flow separate from EA tables and commands to preserve the execution contract.
- Direct-account forms never collect credentials or write telemetry/status confirmations; only a future trusted bridge may supply read-only account data and confirmed connection state.

- MOPSENTRY EA runs on a managed Windows VPS per customer (MetaTrader + EA); the EA logic never moves into the web app. The EA "phones home" via MQL `WebRequest` using a per-user `connection_key` stored in `public.trading_accounts` — the app is the monitor/remote control, the VPS is the executor.
- Customer account linking is self-service: the Account tab shows the connection key and setup steps; the EA authenticates with that key, never with the user's app password.
- Robot option validation and the EA settings response live in a browser-safe shared module so the UI and check-in agree without changing risk controls; execution remains in MQL.
- Appearance uses global semantic tokens and a root theme provider with local device persistence, independent of trading settings.
- Macro Intelligence is read-only commentary: official/calendar fetches and AI run only in authenticated server functions, every shown claim must cite a stored source (enforceCitations), and nothing from it is ever sent to the EA or check-in contract.