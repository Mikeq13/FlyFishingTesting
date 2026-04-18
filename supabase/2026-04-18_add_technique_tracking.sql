alter table if exists public.sessions
  add column if not exists starting_technique text;

alter table if exists public.session_segments
  add column if not exists technique text;

alter table if exists public.experiments
  add column if not exists technique text;
