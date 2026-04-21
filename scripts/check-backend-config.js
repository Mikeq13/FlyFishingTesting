const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const envFiles = ['.env.local', '.env', '.env.development', '.env.preview', '.env.production'];
const requiredFiles = [
  'supabase/verify_friend_beta_schema.sql',
  'supabase/2026-04-20_backfill_experiment_remote_schema.sql'
];
const ignoredDirs = new Set(['.git', '.expo', 'node_modules']);
const configFilePattern = /\.(json|toml|ya?ml|env|js|ts)$/i;
const legacyKeyPattern = /EXPO_PUBLIC_SUPABASE_ANON_KEY/;

const existingEnvContents = envFiles
  .map((relativePath) => path.join(repoRoot, relativePath))
  .filter((absolutePath) => fs.existsSync(absolutePath))
  .map((absolutePath) => fs.readFileSync(absolutePath, 'utf8'))
  .join('\n');

const hasUrl = /EXPO_PUBLIC_SUPABASE_URL\s*=/.test(existingEnvContents) || Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL);
const hasPublishableKey =
  /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY\s*=/.test(existingEnvContents) || Boolean(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

if (!hasUrl || !hasPublishableKey) {
  console.error('Backend config check failed: missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in local env.');
  process.exit(1);
}

const missingFiles = requiredFiles.filter((relativePath) => !fs.existsSync(path.join(repoRoot, relativePath)));
if (missingFiles.length) {
  console.error(`Backend config check failed: missing required verification file(s): ${missingFiles.join(', ')}`);
  process.exit(1);
}

const repoFiles = [];
const collectFiles = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectFiles(absolutePath);
      continue;
    }
    repoFiles.push(absolutePath);
  }
};

collectFiles(repoRoot);

const legacyMatches = repoFiles
  .filter((absolutePath) => !absolutePath.endsWith('package-lock.json'))
  .filter((absolutePath) => configFilePattern.test(absolutePath))
  .filter((absolutePath) => {
    const relativePath = path.relative(repoRoot, absolutePath).replace(/\\/g, '/');
    return (
      relativePath.startsWith('.env') ||
      relativePath === 'app.json' ||
      relativePath === 'eas.json'
    );
  })
  .map((absolutePath) => {
    const content = fs.readFileSync(absolutePath, 'utf8');
    return legacyKeyPattern.test(content) ? path.relative(repoRoot, absolutePath) : null;
  })
  .filter(Boolean);

if (legacyMatches.length) {
  console.error(`Backend config check failed: legacy EXPO_PUBLIC_SUPABASE_ANON_KEY references found in: ${legacyMatches.join(', ')}`);
  process.exit(1);
}

console.log('Backend config check passed. Publishable key env is present, verification SQL exists, and no legacy anon key refs were found.');
console.log('Reminder: run supabase/verify_friend_beta_schema.sql against the live project before cutting preview builds.');
