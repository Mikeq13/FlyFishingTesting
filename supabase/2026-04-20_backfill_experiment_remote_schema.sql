alter table if exists public.experiments
  add column if not exists control_focus text not null default 'pattern';

alter table if exists public.experiments
  add column if not exists water_type text;

alter table if exists public.experiments
  add column if not exists technique text;

alter table if exists public.experiments
  add column if not exists rig_setup_json jsonb;

alter table if exists public.experiments
  add column if not exists fly_entries_json jsonb;

alter table if exists public.experiments
  add column if not exists outcome text not null default 'inconclusive';

alter table if exists public.experiments
  add column if not exists status text not null default 'complete';

alter table if exists public.experiments
  add column if not exists archived_at timestamptz;
