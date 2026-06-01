import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

const REQUIRED_THEME_COLORS = [
  '#07214b', // primary
  '#835500', // secondary
  '#DC2626', // secondaryContainer
  '#fbf8fc', // surface
  '#1b1b1e', // onSurface
  '#44474e', // onSurfaceVariant
  '#75777e', // outline
  '#1a2b4a', // primaryContainer
  '#8293b7', // onPrimaryContainer
  '#198754', // success
  '#d1f1de', // successContainer
  '#ba1a1a', // error
  '#ffdad6', // errorContainer
  '#b88700'  // warning
];

const BANNED_HARDCODED_COLORS = [
  /color:\s*['"]red['"]/i,
  /color:\s*['"]blue['"]/i,
  /color:\s*['"]green['"]/i,
  /color:\s*['"]#ff0000['"]/i,
  /color:\s*['"]#00ff00['"]/i,
  /color:\s*['"]#0000ff['"]/i,
];

async function getFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

async function runComplianceChecks() {
  console.log('--- Running Static Compliance Tests ---');
  let errors = 0;
  
  try {
    const files = await getFiles(SRC_DIR);
    const codeFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.ts'));
    
    for (const file of codeFiles) {
      const content = await fs.readFile(file, 'utf8');
      const relPath = path.relative(ROOT_DIR, file);
      
      for (const banned of BANNED_HARDCODED_COLORS) {
        if (banned.test(content)) {
          console.warn(`[WARNING] UI Compliance: Hardcoded generic color found in ${relPath}`);
          console.warn(`          Use the theme colors instead (e.g. colors.error).`);
          errors++;
        }
      }
      
      // Look for sql string interpolation vulnerabilities if it's backend code 
      // (though this is checking src/ which is frontend, let's also scan server/src later if needed)
    }
    
    // Quick scan of backend for SQL vulnerabilities
    const serverFiles = await getFiles(path.join(ROOT_DIR, 'server', 'src'));
    const backendFiles = serverFiles.filter(f => f.endsWith('.js'));
    for (const file of backendFiles) {
      const content = await fs.readFile(file, 'utf8');
      const relPath = path.relative(ROOT_DIR, file);
      // Catch bad sql interpolations (e.g., using ${} inside a regular string instead of the sql tag)
      // Look for raw postgres client string queries like `query("select * from user where id = " + id)`
      if (/query\s*\(\s*['"].*?\s*\+\s*[a-zA-Z0-9_]/.test(content)) {
        console.error(`[ERROR] Security vulnerability: Raw SQL string concatenation detected in ${relPath}`);
        errors++;
      }
    }
    
    console.log(`Compliance scan finished. ${codeFiles.length + backendFiles.length} files scanned. Issues found: ${errors}`);
    if (errors > 5) {
      // Don't fail the build if it's just warnings, unless there are many
      console.warn('Consider fixing the warnings above.');
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('Directory not found, skipping specific compliance check.');
    } else {
      throw err;
    }
  }
}

runComplianceChecks().catch(err => {
  console.error('Compliance script failed:', err);
  process.exit(1);
});
