/*
 * One-shot migration: replace static `colors` import from theme with a
 * useTheme() hook so every component re-renders on theme change.
 *
 * Skips: files that already use useTheme, theme/* files themselves, and
 * components that genuinely need the static palette (ErrorBoundary).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');

const SKIP = new Set([
  path.join(ROOT, 'components', 'ErrorBoundary.js'),
  path.join(ROOT, 'theme', 'colors.js'),
  path.join(ROOT, 'theme', 'colors-dark.js'),
  path.join(ROOT, 'theme', 'spacing.js'),
  path.join(ROOT, 'theme', 'typography.js'),
  path.join(ROOT, 'theme', 'index.js'),
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (entry.endsWith('.js')) out.push(p);
  }
  return out;
}

function relCtx(file) {
  const dir = path.dirname(file);
  const target = path.join(ROOT, 'context', 'ThemeContext');
  let rel = path.relative(dir, target).split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

const files = walk(ROOT);

let touched = 0;
let skipped = 0;
const report = [];

for (const file of files) {
  if (SKIP.has(file)) {
    skipped++;
    continue;
  }
  let src = fs.readFileSync(file, 'utf8');

  // Look for any import of `colors` from a theme path
  // (both relative depths: '../theme' and '../../theme')
  const importRe = /import\s*\{([^}]+)\}\s*from\s*['"]([.\/]+theme)['"];?/g;
  let m;
  let modifiedImport = false;
  const newSrc = src.replace(importRe, (full, namedRaw, from) => {
    const names = namedRaw.split(',').map((s) => s.trim()).filter(Boolean);
    if (!names.includes('colors')) return full;
    const kept = names.filter((n) => n !== 'colors');
    modifiedImport = true;
    if (kept.length === 0) return `// colors now via useTheme()`;
    return `import { ${kept.join(', ')} } from '${from}';`;
  });

  if (!modifiedImport) continue;

  // Decide if we still need to add useTheme import — only if it's not already imported.
  let result = newSrc;
  if (!/useTheme/.test(result)) {
    const themeImport = `import { useTheme } from '${relCtx(file)}';`;
    // Insert after the first import line
    const firstImportEnd = result.indexOf('\n', result.indexOf('import'));
    result = result.slice(0, firstImportEnd + 1) + themeImport + '\n' + result.slice(firstImportEnd + 1);
  }

  // Inject `const { colors } = useTheme();` at the start of each function/arrow
  // component that references `colors.` in its body. We find function bodies
  // and inject after their opening brace if `colors.` appears within.
  result = injectColorsHook(result);

  if (result !== src) {
    fs.writeFileSync(file, result);
    touched++;
    report.push(path.relative(ROOT, file));
  }
}

function injectColorsHook(src) {
  // Walk through balanced braces of every function/arrow component body.
  // A "candidate" body starts at one of:
  //   export default function Name(...) {
  //   export function Name(...) {
  //   function Name(...) {
  //   const Name = (...) => {
  //   function ({...}) {  (inline default export)
  // We inject `const { colors } = useTheme();\n` after the opening `{` if
  // the body uses `colors.` and doesn't already declare it locally.

  const out = [];
  let i = 0;
  while (i < src.length) {
    // try to match a function-component header
    const matcher = /(export\s+default\s+function\s+\w*\s*\([^)]*\)\s*\{|export\s+function\s+\w+\s*\([^)]*\)\s*\{|function\s+\w+\s*\([^)]*\)\s*\{|const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{)/g;
    matcher.lastIndex = i;
    const match = matcher.exec(src);
    if (!match) {
      out.push(src.slice(i));
      break;
    }
    const start = match.index;
    out.push(src.slice(i, start + match[0].length));

    // find balanced brace end
    let depth = 1;
    let j = start + match[0].length;
    while (j < src.length && depth > 0) {
      const c = src[j];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      j++;
    }
    const body = src.slice(start + match[0].length, j - 1);
    let injectedBody = body;
    if (/\bcolors\.\w+/.test(body) && !/const\s*\{\s*colors\s*[},]/.test(body) && !/const\s+colors\s*=/.test(body)) {
      // inject after opening brace
      injectedBody = '\n  const { colors } = useTheme();' + body;
    }
    out.push(injectedBody);
    out.push('}');
    i = j;
  }
  return out.join('');
}

console.log(`Migrated ${touched} files. Skipped ${skipped}.`);
console.log(report.map((r) => '  • ' + r).join('\n'));
