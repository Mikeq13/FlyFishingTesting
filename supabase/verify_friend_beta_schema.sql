select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'is_group_member',
    'is_competition_participant',
    'shares_group_with_user',
    'shares_competition_with_user',
    'has_session_share_visibility',
    'can_read_session'
  )
order by routine_name;

select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'groups',
    'group_memberships',
    'share_preferences',
    'invites',
    'competitions',
    'competition_participants',
    'competition_session_assignments',
    'sessions',
    'session_group_shares'
  )
order by tablename, policyname;

select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
  and position('public.group_memberships' in coalesce(qual, '')) > 0
  and tablename = 'group_memberships';

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'sessions' and column_name = 'starting_technique')
    or (table_name = 'session_segments' and column_name = 'technique')
    or (table_name = 'experiments' and column_name = 'technique')
    or (table_name = 'experiments' and column_name = 'water_type')
  )
order by table_name, column_name;
