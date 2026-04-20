alter table public.saved_flies add column if not exists normalized_name text;
alter table public.saved_leader_formulas add column if not exists normalized_name text;
alter table public.saved_rig_presets add column if not exists normalized_name text;
alter table public.saved_rivers add column if not exists normalized_name text;

update public.saved_flies
set normalized_name = lower(trim(coalesce(payload_json ->> 'name', '')))
where normalized_name is null;

update public.saved_leader_formulas
set normalized_name = lower(trim(coalesce(payload_json ->> 'name', '')))
where normalized_name is null;

update public.saved_rig_presets
set normalized_name = lower(trim(coalesce(payload_json ->> 'name', '')))
where normalized_name is null;

update public.saved_rivers
set normalized_name = lower(trim(coalesce(name, '')))
where normalized_name is null;

with ranked_saved_flies as (
  select id,
         row_number() over (
           partition by owner_auth_user_id, normalized_name
           order by created_at desc, id desc
         ) as rn
  from public.saved_flies
)
delete from public.saved_flies
where id in (select id from ranked_saved_flies where rn > 1);

with ranked_saved_leader_formulas as (
  select id,
         row_number() over (
           partition by owner_auth_user_id, normalized_name
           order by created_at desc, id desc
         ) as rn
  from public.saved_leader_formulas
)
delete from public.saved_leader_formulas
where id in (select id from ranked_saved_leader_formulas where rn > 1);

with ranked_saved_rig_presets as (
  select id,
         row_number() over (
           partition by owner_auth_user_id, normalized_name
           order by created_at desc, id desc
         ) as rn
  from public.saved_rig_presets
)
delete from public.saved_rig_presets
where id in (select id from ranked_saved_rig_presets where rn > 1);

with ranked_saved_rivers as (
  select id,
         row_number() over (
           partition by owner_auth_user_id, normalized_name
           order by created_at desc, id desc
         ) as rn
  from public.saved_rivers
)
delete from public.saved_rivers
where id in (select id from ranked_saved_rivers where rn > 1);

with ranked_draft_experiments as (
  select id,
         row_number() over (
           partition by owner_auth_user_id, session_id
           order by id desc
         ) as rn
  from public.experiments
  where status = 'draft'
    and archived_at is null
)
delete from public.experiments
where id in (select id from ranked_draft_experiments where rn > 1);

create unique index if not exists idx_saved_flies_owner_normalized_name
  on public.saved_flies(owner_auth_user_id, normalized_name);

create unique index if not exists idx_saved_leader_formulas_owner_normalized_name
  on public.saved_leader_formulas(owner_auth_user_id, normalized_name);

create unique index if not exists idx_saved_rig_presets_owner_normalized_name
  on public.saved_rig_presets(owner_auth_user_id, normalized_name);

create unique index if not exists idx_saved_rivers_owner_normalized_name
  on public.saved_rivers(owner_auth_user_id, normalized_name);

create unique index if not exists idx_experiments_owner_session_active_draft
  on public.experiments(owner_auth_user_id, session_id)
  where status = 'draft' and archived_at is null;
