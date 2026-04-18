select
  n.nspname as schema_name,
  p.proname as function_name,
  p.prosecdef as is_security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'is_group_member',
    'is_competition_participant',
    'shares_group_with_user',
    'shares_competition_with_user'
  )
order by p.proname;

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('group_memberships', 'competition_participants');

select
  schemaname,
  tablename,
  policyname,
  cmd,
  coalesce(qual, '') as qual,
  coalesce(with_check, '') as with_check
from pg_policies
where schemaname = 'public'
  and (
    coalesce(qual, '') ilike '%group_memberships%'
    or coalesce(with_check, '') ilike '%group_memberships%'
    or coalesce(qual, '') ilike '%competition_participants%'
    or coalesce(with_check, '') ilike '%competition_participants%'
  )
order by tablename, policyname;
