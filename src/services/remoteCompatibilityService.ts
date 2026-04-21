import { RemoteSchemaCheck, RemoteSchemaDiagnostics } from '@/types/remote';
import { supabase } from './supabaseClient';

type CompatibilityRequirement = {
  key: string;
  label: string;
  table: string;
  select: string;
};

const REMOTE_COMPATIBILITY_REQUIREMENTS: CompatibilityRequirement[] = [
  {
    key: 'profiles_shape',
    label: 'Profiles access schema',
    table: 'profiles',
    select: 'id, name, email, role, access_level'
  },
  {
    key: 'session_group_shares',
    label: 'Session group sharing schema',
    table: 'session_group_shares',
    select: 'id, owner_auth_user_id, session_id, group_id, created_at'
  },
  {
    key: 'experiments_shape',
    label: 'Experiments shared schema',
    table: 'experiments',
    select:
      'id, session_id, hypothesis, control_focus, water_type, technique, rig_setup_json, fly_entries_json, outcome, status, archived_at'
  },
  {
    key: 'saved_flies_identity',
    label: 'Saved fly identity schema',
    table: 'saved_flies',
    select: 'id, owner_auth_user_id, normalized_name, payload_json'
  },
  {
    key: 'saved_leader_formulas_identity',
    label: 'Leader formula identity schema',
    table: 'saved_leader_formulas',
    select: 'id, owner_auth_user_id, normalized_name, payload_json'
  },
  {
    key: 'saved_rig_presets_identity',
    label: 'Rig preset identity schema',
    table: 'saved_rig_presets',
    select: 'id, owner_auth_user_id, normalized_name, payload_json'
  },
  {
    key: 'saved_rivers_identity',
    label: 'Saved river identity schema',
    table: 'saved_rivers',
    select: 'id, owner_auth_user_id, normalized_name, name, created_at'
  }
];

const describeCompatibilityError = (message?: string | null, details?: string | null, hint?: string | null) =>
  [message, details, hint].filter(Boolean).join(' | ') || 'Remote schema check failed.';

export const verifyRemoteSchemaCompatibility = async (): Promise<RemoteSchemaDiagnostics> => {
  const checks = await Promise.all(
    REMOTE_COMPATIBILITY_REQUIREMENTS.map(async (requirement): Promise<RemoteSchemaCheck> => {
      const response = await supabase.from(requirement.table).select(requirement.select).limit(1);
      if (!response.error) {
        return {
          key: requirement.key,
          label: requirement.label,
          status: 'ok'
        };
      }

      const { error } = response;
      const message = describeCompatibilityError(error.message, error.details, error.hint);
      if (error.code === '42703' || error.code === 'PGRST205' || error.code === 'PGRST116' || error.code === '42P01') {
        return {
          key: requirement.key,
          label: requirement.label,
          status: 'incompatible',
          message
        };
      }

      return {
        key: requirement.key,
        label: requirement.label,
        status: 'error',
        message
      };
    })
  );

  const checkedAt = new Date().toISOString();
  const incompatibleChecks = checks.filter((check) => check.status === 'incompatible');
  const erroredChecks = checks.filter((check) => check.status === 'error');

  if (incompatibleChecks.length) {
    return {
      status: 'incompatible',
      checkedAt,
      message:
        'Shared beta backend is missing one or more required schema changes for this app build. Run the pending Supabase verification and migration SQL before trusting shared sync.',
      checks
    };
  }

  if (erroredChecks.length) {
    return {
      status: 'error',
      checkedAt,
      message:
        'Could not fully verify remote schema compatibility right now. Check backend availability or permissions before trusting shared sync.',
      checks
    };
  }

  return {
    status: 'compatible',
    checkedAt,
    message: 'Remote schema matches the fields this app build requires for shared bootstrap and sync.',
    checks
  };
};
