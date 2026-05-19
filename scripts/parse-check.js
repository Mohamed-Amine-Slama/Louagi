// Quick parser sanity-check: walks src/ + App.js and tries to transform each
// JS file through Babel using the Expo preset. Errors out on any syntax issue.
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const roots = ['App.js', 'src'];
const files = [];
function walk(p) {
  const stat = fs.statSync(p);
  if (stat.isDirectory()) {
    for (const f of fs.readdirSync(p)) walk(path.join(p, f));
  } else if (p.endsWith('.js')) {
    files.push(p);
  }
}
roots.forEach((r) => walk(r));

let failed = 0;
for (const f of files) {
  try {
    babel.parseSync(fs.readFileSync(f, 'utf8'), {
      filename: f,
      presets: ['babel-preset-expo'],
      babelrc: false,
      configFile: false,
    });
  } catch (e) {
    failed++;
    console.error('PARSE FAIL', f, '\n  ', e.message);
  }
}
if (!failed) console.log(`OK — parsed ${files.length} files`);
process.exit(failed ? 1 : 0);
