const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(repoRoot, 'src');
const allowedFiles = new Set([path.join(srcRoot, 'design', 'theme.ts')]);
const pattern = /#[0-9A-Fa-f]{3,8}\b|rgba?\s*\(/;
const offenders = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.tsx')) continue;
    if (allowedFiles.has(fullPath)) continue;

    const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        offenders.push({ file: path.relative(repoRoot, fullPath), line: index + 1, text: line.trim() });
      }
    });
  }
};

walk(srcRoot);

if (offenders.length) {
  console.error('Hardcoded theme colors are only allowed in src/design/theme.ts');
  offenders.forEach((offender) => {
    console.error(`${offender.file}:${offender.line}: ${offender.text}`);
  });
  process.exit(1);
}

console.log('Theme hardcoding check passed. Raw color values only exist in src/design/theme.ts.');
