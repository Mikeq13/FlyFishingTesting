create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  local_record_id bigint,
  name text not null,
  email text,
  role text not null default 'angler',
  access_level text not null default 'free',
  subscription_status text not null default 'not_started',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  subscription_expires_at timestamptz,
  granted_by_auth_user_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  name text not null,
  join_code text not null,
  created_at timestamptz not null default now(),
  unique (owner_auth_user_id, local_record_id),
  unique (join_code)
);

create table if not exists public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  group_id uuid not null references public.groups(id) on delete cascade,
  member_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  membership_role text not null default 'member',
  joined_at timestamptz not null default now(),
  unique (owner_auth_user_id, local_record_id),
  unique (group_id, member_auth_user_id)
);

create table if not exists public.share_preferences (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  share_journal_entries boolean not null default false,
  share_practice_sessions boolean not null default false,
  share_competition_sessions boolean not null default false,
  share_insights boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (owner_auth_user_id, local_record_id),
  unique (group_id, user_auth_user_id)
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  inviter_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  target_group_id uuid not null references public.groups(id) on delete cascade,
  invite_code text not null,
  target_name text,
  grant_type text not null default 'power_user_group',
  status text not null default 'pending',
  accepted_by_auth_user_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  unique (owner_auth_user_id, local_record_id),
  unique (invite_code)
);

create table if not exists public.sponsored_access (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  sponsor_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  sponsored_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  target_group_id uuid not null references public.groups(id) on delete cascade,
  granted_access_level text not null default 'power_user',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (owner_auth_user_id, local_record_id)
);

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  organizer_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  join_code text not null,
  group_count integer not null default 1,
  session_count integer not null default 1,
  created_at timestamptz not null default now(),
  unique (owner_auth_user_id, local_record_id),
  unique (join_code)
);

create table if not exists public.competition_groups (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  label text not null,
  sort_order integer not null,
  unique (owner_auth_user_id, local_record_id)
);

create table if not exists public.competition_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  session_number integer not null,
  start_time text not null,
  end_time text not null,
  unique (owner_auth_user_id, local_record_id)
);

create table if not exists public.competition_participants (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  participant_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (owner_auth_user_id, local_record_id),
  unique (competition_id, participant_auth_user_id)
);

create table if not exists public.competition_session_assignments (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  participant_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  competition_group_id uuid not null references public.competition_groups(id) on delete cascade,
  competition_session_id uuid not null references public.competition_sessions(id) on delete cascade,
  beat text not null,
  assignment_role text not null default 'fishing',
  linked_session_local_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_auth_user_id, local_record_id)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  session_mode text not null,
  date timestamptz not null,
  planned_duration_minutes integer,
  alert_interval_minutes integer,
  alert_markers_json jsonb,
  notification_sound_enabled boolean not null default true,
  notification_vibration_enabled boolean not null default true,
  ended_at timestamptz,
  start_at timestamptz,
  end_at timestamptz,
  water_type text not null,
  depth_range text not null,
  shared_group_id uuid references public.groups(id),
  practice_measurement_enabled boolean not null default false,
  practice_length_unit text not null default 'in',
  competition_id uuid references public.competitions(id),
  competition_assignment_id uuid references public.competition_session_assignments(id),
  competition_group_id uuid references public.competition_groups(id),
  competition_session_id uuid references public.competition_sessions(id),
  competition_assigned_group text,
  competition_role text,
  competition_beat text,
  competition_session_number integer,
  competition_requires_measurement boolean not null default true,
  competition_length_unit text not null default 'mm',
  starting_rig_setup_json jsonb,
  river_name text,
  hypothesis text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_auth_user_id, local_record_id)
);

create table if not exists public.session_segments (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  session_id uuid not null references public.sessions(id) on delete cascade,
  session_mode text not null,
  river_name text,
  water_type text not null,
  depth_range text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  rig_setup_json jsonb,
  fly_snapshots_json jsonb not null,
  notes text,
  unique (owner_auth_user_id, local_record_id)
);

create table if not exists public.catch_events (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  session_id uuid not null references public.sessions(id) on delete cascade,
  segment_id uuid references public.session_segments(id) on delete cascade,
  session_mode text not null,
  fly_name text,
  fly_snapshot_json jsonb,
  species text,
  length_value double precision,
  length_unit text not null,
  caught_at timestamptz not null,
  notes text,
  unique (owner_auth_user_id, local_record_id)
);

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  session_id uuid not null references public.sessions(id) on delete cascade,
  hypothesis text not null,
  control_focus text not null,
  rig_setup_json jsonb,
  fly_entries_json jsonb not null,
  control_fly_json jsonb not null,
  variant_fly_json jsonb not null,
  control_casts integer not null,
  control_catches integer not null,
  variant_casts integer not null,
  variant_catches integer not null,
  winner text not null,
  outcome text not null,
  status text not null,
  confidence_score double precision not null,
  archived_at timestamptz,
  unique (owner_auth_user_id, local_record_id)
);

create table if not exists public.saved_flies (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  payload_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (owner_auth_user_id, local_record_id)
);

create table if not exists public.saved_leader_formulas (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  payload_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (owner_auth_user_id, local_record_id)
);

create table if not exists public.saved_rig_presets (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  payload_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (owner_auth_user_id, local_record_id)
);

create table if not exists public.saved_rivers (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  name text not null,
  created_at timestamptz not null default now(),
  unique (owner_auth_user_id, local_record_id)
);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.share_preferences enable row level security;
alter table public.invites enable row level security;
alter table public.sponsored_access enable row level security;
alter table public.competitions enable row level security;
alter table public.competition_groups enable row level security;
alter table public.competition_sessions enable row level security;
alter table public.competition_participants enable row level security;
alter table public.competition_session_assignments enable row level security;
alter table public.sessions enable row level security;
alter table public.session_segments enable row level security;
alter table public.catch_events enable row level security;
alter table public.experiments enable row level security;
alter table public.saved_flies enable row level security;
alter table public.saved_leader_formulas enable row level security;
alter table public.saved_rig_presets enable row level security;
alter table public.saved_rivers enable row level security;

create policy "users manage own profile" on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "users manage owned rows" on public.groups
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());

create policy "members read shared groups" on public.groups
for select using (
  exists (
    select 1 from public.group_memberships
    where group_memberships.group_id = groups.id
      and group_memberships.member_auth_user_id = auth.uid()
  )
);

create policy "users manage owned group memberships" on public.group_memberships
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());

create policy "members read competition and shared records" on public.competitions
for select using (
  owner_auth_user_id = auth.uid()
  or exists (
    select 1 from public.competition_participants
    where competition_participants.competition_id = competitions.id
      and competition_participants.participant_auth_user_id = auth.uid()
  )
);

create policy "owners manage competitions" on public.competitions
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());

create policy "owners manage tables by owner_auth_user_id" on public.share_preferences
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage invites" on public.invites
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage sponsored access" on public.sponsored_access
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage competition groups" on public.competition_groups
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage competition sessions" on public.competition_sessions
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage competition participants" on public.competition_participants
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage competition assignments" on public.competition_session_assignments
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage sessions" on public.sessions
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage session segments" on public.session_segments
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage catch events" on public.catch_events
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage experiments" on public.experiments
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage saved flies" on public.saved_flies
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage saved formulas" on public.saved_leader_formulas
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage saved rig presets" on public.saved_rig_presets
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage saved rivers" on public.saved_rivers
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
