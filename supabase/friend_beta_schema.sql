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
  starting_technique text,
  river_name text,
  hypothesis text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_auth_user_id, local_record_id)
);

create table if not exists public.session_group_shares (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  session_id uuid not null references public.sessions(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_auth_user_id, local_record_id),
  unique (owner_auth_user_id, session_id, group_id)
);

create index if not exists idx_session_group_shares_session_id on public.session_group_shares(session_id);
create index if not exists idx_session_group_shares_group_id on public.session_group_shares(group_id);
create index if not exists idx_session_group_shares_owner_local on public.session_group_shares(owner_auth_user_id, local_record_id);

create table if not exists public.session_segments (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references public.profiles(id) on delete cascade,
  local_record_id bigint,
  session_id uuid not null references public.sessions(id) on delete cascade,
  session_mode text not null,
  river_name text,
  water_type text not null,
  depth_range text not null,
  technique text,
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
  water_type text,
  technique text,
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
alter table public.session_group_shares enable row level security;
alter table public.session_segments enable row level security;
alter table public.catch_events enable row level security;
alter table public.experiments enable row level security;
alter table public.saved_flies enable row level security;
alter table public.saved_leader_formulas enable row level security;
alter table public.saved_rig_presets enable row level security;
alter table public.saved_rivers enable row level security;

create or replace function public.is_group_member(
  target_group_id uuid,
  viewer_auth_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_memberships gm
    where gm.group_id = target_group_id
      and gm.member_auth_user_id = viewer_auth_user_id
  );
$$;

create or replace function public.is_competition_participant(
  target_competition_id uuid,
  viewer_auth_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.competition_participants cp
    where cp.competition_id = target_competition_id
      and cp.participant_auth_user_id = viewer_auth_user_id
  );
$$;

create or replace function public.shares_group_with_user(
  target_profile_id uuid,
  viewer_auth_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_memberships gm_self
    join public.group_memberships gm_target
      on gm_target.group_id = gm_self.group_id
    where gm_self.member_auth_user_id = viewer_auth_user_id
      and gm_target.member_auth_user_id = target_profile_id
  );
$$;

create or replace function public.shares_competition_with_user(
  target_profile_id uuid,
  viewer_auth_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.competition_participants cp_self
    join public.competition_participants cp_target
      on cp_target.competition_id = cp_self.competition_id
    where cp_self.participant_auth_user_id = viewer_auth_user_id
      and cp_target.participant_auth_user_id = target_profile_id
  );
$$;

create or replace function public.has_session_share_visibility(
  target_session_id uuid,
  viewer_auth_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sessions s
    join (
      select s.shared_group_id as group_id
      where s.shared_group_id is not null
      union
      select sgs.group_id
      from public.session_group_shares sgs
      where sgs.session_id = s.id
    ) session_groups on true
    join public.share_preferences sp
      on sp.group_id = session_groups.group_id
     and sp.user_auth_user_id = s.owner_auth_user_id
    where s.id = target_session_id
      and public.is_group_member(session_groups.group_id, viewer_auth_user_id)
      and (
        (s.session_mode = 'practice' and sp.share_practice_sessions = true)
        or (s.session_mode = 'competition' and sp.share_competition_sessions = true)
        or (s.session_mode = 'experiment' and sp.share_journal_entries = true)
      )
  );
$$;

create or replace function public.can_read_session(
  target_session_id uuid,
  viewer_auth_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sessions s
    where s.id = target_session_id
      and (
        s.owner_auth_user_id = viewer_auth_user_id
        or public.has_session_share_visibility(target_session_id, viewer_auth_user_id)
        or (
          s.competition_id is not null
          and public.is_competition_participant(s.competition_id, viewer_auth_user_id)
        )
      )
  );
$$;

grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.is_competition_participant(uuid, uuid) to authenticated;
grant execute on function public.shares_group_with_user(uuid, uuid) to authenticated;
grant execute on function public.shares_competition_with_user(uuid, uuid) to authenticated;
grant execute on function public.has_session_share_visibility(uuid, uuid) to authenticated;
grant execute on function public.can_read_session(uuid, uuid) to authenticated;

drop policy if exists "users manage own profile" on public.profiles;
drop policy if exists "members read related profiles" on public.profiles;
drop policy if exists "users manage owned rows" on public.groups;
drop policy if exists "members read shared groups" on public.groups;
drop policy if exists "users manage owned group memberships" on public.group_memberships;
drop policy if exists "members read shared group memberships" on public.group_memberships;
drop policy if exists "members read competition and shared records" on public.competitions;
drop policy if exists "owners manage competitions" on public.competitions;
drop policy if exists "owners manage tables by owner_auth_user_id" on public.share_preferences;
drop policy if exists "members read group share preferences" on public.share_preferences;
drop policy if exists "owners manage invites" on public.invites;
drop policy if exists "members read relevant invites" on public.invites;
drop policy if exists "owners manage sponsored access" on public.sponsored_access;
drop policy if exists "participants read relevant sponsored access" on public.sponsored_access;
drop policy if exists "owners manage competition groups" on public.competition_groups;
drop policy if exists "participants read competition groups" on public.competition_groups;
drop policy if exists "owners manage competition sessions" on public.competition_sessions;
drop policy if exists "participants read competition sessions" on public.competition_sessions;
drop policy if exists "owners manage competition participants" on public.competition_participants;
drop policy if exists "participants read competition participants" on public.competition_participants;
drop policy if exists "owners manage competition assignments" on public.competition_session_assignments;
drop policy if exists "participants read competition assignments" on public.competition_session_assignments;
drop policy if exists "owners manage sessions" on public.sessions;
drop policy if exists "shared sessions readable by group members" on public.sessions;
drop policy if exists "owners manage session group shares" on public.session_group_shares;
drop policy if exists "visible session group shares readable" on public.session_group_shares;
drop policy if exists "owners manage session segments" on public.session_segments;
drop policy if exists "shared session segments readable" on public.session_segments;
drop policy if exists "owners manage catch events" on public.catch_events;
drop policy if exists "shared catch events readable" on public.catch_events;
drop policy if exists "owners manage experiments" on public.experiments;
drop policy if exists "shared experiments readable" on public.experiments;
drop policy if exists "owners manage saved flies" on public.saved_flies;
drop policy if exists "owners manage saved formulas" on public.saved_leader_formulas;
drop policy if exists "owners manage saved rig presets" on public.saved_rig_presets;
drop policy if exists "owners manage saved rivers" on public.saved_rivers;

create policy "users manage own profile" on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "members read related profiles" on public.profiles
for select using (
  auth.uid() = id
  or public.shares_group_with_user(profiles.id)
  or public.shares_competition_with_user(profiles.id)
);

create policy "users manage owned rows" on public.groups
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());

create policy "members read shared groups" on public.groups
for select using (
  owner_auth_user_id = auth.uid()
  or public.is_group_member(groups.id)
);

create policy "users manage owned group memberships" on public.group_memberships
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());

create policy "members read shared group memberships" on public.group_memberships
for select using (
  owner_auth_user_id = auth.uid()
  or member_auth_user_id = auth.uid()
  or public.is_group_member(group_memberships.group_id)
);

create policy "members read competition and shared records" on public.competitions
for select using (
  owner_auth_user_id = auth.uid()
  or public.is_competition_participant(competitions.id)
);

create policy "owners manage competitions" on public.competitions
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());

create policy "owners manage tables by owner_auth_user_id" on public.share_preferences
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "members read group share preferences" on public.share_preferences
for select using (
  owner_auth_user_id = auth.uid()
  or public.is_group_member(share_preferences.group_id)
);
create policy "owners manage invites" on public.invites
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "members read relevant invites" on public.invites
for select using (
  owner_auth_user_id = auth.uid()
  or inviter_auth_user_id = auth.uid()
  or accepted_by_auth_user_id = auth.uid()
  or public.is_group_member(invites.target_group_id)
);
create policy "owners manage sponsored access" on public.sponsored_access
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "participants read relevant sponsored access" on public.sponsored_access
for select using (
  owner_auth_user_id = auth.uid()
  or sponsor_auth_user_id = auth.uid()
  or sponsored_auth_user_id = auth.uid()
);
create policy "owners manage competition groups" on public.competition_groups
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "participants read competition groups" on public.competition_groups
for select using (
  owner_auth_user_id = auth.uid()
  or public.is_competition_participant(competition_groups.competition_id)
);
create policy "owners manage competition sessions" on public.competition_sessions
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "participants read competition sessions" on public.competition_sessions
for select using (
  owner_auth_user_id = auth.uid()
  or public.is_competition_participant(competition_sessions.competition_id)
);
create policy "owners manage competition participants" on public.competition_participants
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "participants read competition participants" on public.competition_participants
for select using (
  owner_auth_user_id = auth.uid()
  or participant_auth_user_id = auth.uid()
  or public.is_competition_participant(competition_participants.competition_id)
);
create policy "owners manage competition assignments" on public.competition_session_assignments
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "participants read competition assignments" on public.competition_session_assignments
for select using (
  owner_auth_user_id = auth.uid()
  or participant_auth_user_id = auth.uid()
  or public.is_competition_participant(competition_session_assignments.competition_id)
);
create policy "owners manage sessions" on public.sessions
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "shared sessions readable by group members" on public.sessions
for select using (
  public.can_read_session(sessions.id)
);
create policy "owners manage session group shares" on public.session_group_shares
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "visible session group shares readable" on public.session_group_shares
for select using (
  owner_auth_user_id = auth.uid()
  or public.can_read_session(session_group_shares.session_id)
);
create policy "owners manage session segments" on public.session_segments
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "shared session segments readable" on public.session_segments
for select using (
  owner_auth_user_id = auth.uid()
  or exists (
    select 1
    where public.can_read_session(session_segments.session_id)
  )
);
create policy "owners manage catch events" on public.catch_events
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "shared catch events readable" on public.catch_events
for select using (
  owner_auth_user_id = auth.uid()
  or exists (
    select 1
    where public.can_read_session(catch_events.session_id)
  )
);
create policy "owners manage experiments" on public.experiments
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "shared experiments readable" on public.experiments
for select using (
  owner_auth_user_id = auth.uid()
  or exists (
    select 1
    where public.can_read_session(experiments.session_id)
  )
);
create policy "owners manage saved flies" on public.saved_flies
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage saved formulas" on public.saved_leader_formulas
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage saved rig presets" on public.saved_rig_presets
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
create policy "owners manage saved rivers" on public.saved_rivers
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());
