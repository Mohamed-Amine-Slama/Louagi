/*
 * Mechanical RTL fixer: rewrites style props that hard-code Left/Right to
 * logical Start/End equivalents so React Native flips them under RTL.
 *
 * Maps:
 *   marginLeft  -> marginStart
 *   marginRight -> marginEnd
 *   paddingLeft -> paddingStart
 *   paddingRight-> paddingEnd
 *   borderLeftWidth/borderLeftColor -> borderStart*
 *   borderRightWidth/borderRightColor -> borderEnd*
 *
 * Leaves absolute `left:` / `right:` alone — those are anchor corners (often
 * symmetric, like dot badges) and flipping them automatically would break
 * intentional corners. Hand-edit any place that's directionally meaningful.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir)) {
    const p = path.join(dir, e);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (e.endsWith('.js')) out.push(p);
  }
  return out;
}

const REPLACEMENTS = [
  [/marginLeft\b/g, 'marginStart'],
  [/marginRight\b/g, 'marginEnd'],
  [/paddingLeft\b/g, 'paddingStart'],
  [/paddingRight\b/g, 'paddingEnd'],
  [/borderLeftWidth\b/g, 'borderStartWidth'],
  [/borderLeftColor\b/g, 'borderStartColor'],
  [/borderRightWidth\b/g, 'borderEndWidth'],
  [/borderRightColor\b/g, 'borderEndColor'],
];

let touched = 0;
const log = [];
for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, 'utf8');
  let next = src;
  for (const [re, to] of REPLACEMENTS) next = next.replace(re, to);
  if (next !== src) {
    fs.writeFileSync(file, next);
    touched++;
    log.push(path.relative(ROOT, file));
  }
}

console.log(`RTL-fixed ${touched} files`);
console.log(log.map((l) => '  • ' + l).join('\n'));
