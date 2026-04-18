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

alter table public.session_group_shares enable row level security;

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

grant execute on function public.has_session_share_visibility(uuid, uuid) to authenticated;
grant execute on function public.can_read_session(uuid, uuid) to authenticated;

drop policy if exists "owners manage session group shares" on public.session_group_shares;
drop policy if exists "visible session group shares readable" on public.session_group_shares;

create policy "owners manage session group shares" on public.session_group_shares
for all using (owner_auth_user_id = auth.uid()) with check (owner_auth_user_id = auth.uid());

create policy "visible session group shares readable" on public.session_group_shares
for select using (
  owner_auth_user_id = auth.uid()
  or public.can_read_session(session_group_shares.session_id)
);
