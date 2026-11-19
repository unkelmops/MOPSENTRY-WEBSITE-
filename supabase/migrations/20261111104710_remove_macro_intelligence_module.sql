-- Remove Macro Intelligence and its associated fundamental-history backend tables.
-- The separate Signals feature uses a smaller calendar cache recreated by the next migration.
drop trigger if exists fundamental_event_history_preserve_actual on public.fundamental_event_history;
drop trigger if exists macro_source_observations_revision on public.macro_source_observations;
drop function if exists public.preserve_fundamental_actual();
drop function if exists public.track_macro_revision();
drop table if exists public.macro_saved_analyses;
drop table if exists public.macro_event_analysis;
drop table if exists public.macro_source_observations;
drop table if exists public.fundamental_sync_state;
drop table if exists public.fundamental_event_history;