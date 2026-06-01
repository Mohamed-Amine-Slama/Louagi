import { spawn, execSync } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(ROOT_DIR, 'server');

async function waitForServer(port = 3000, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
          if (res.statusCode === 200) resolve();
          else reject();
        });
        req.on('error', reject);
        req.end();
      });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return false;
}

async function runScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`\n======================================`);
    console.log(`🚀 Running: node ${path.basename(scriptPath)} ${args.join(' ')}`);
    console.log(`======================================\n`);
    
    const proc = spawn('node', [scriptPath, ...args], { stdio: 'inherit', cwd: ROOT_DIR });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Script exited with code ${code}`));
    });
  });
}

async function main() {
  console.log('🔄 Checking if server is already running...');
  const isRunning = await waitForServer(3000, 2);
  
  let serverProc = null;
  if (!isRunning) {
    console.log('🔄 Server not running. Starting local backend instance...');
    serverProc = spawn('npm', ['run', 'dev'], { 
      cwd: SERVER_DIR,
      env: { ...process.env, USE_REDIS: 'false' },
      stdio: 'pipe'
    });
    
    serverProc.stdout.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('error') || msg.includes('Error')) {
        console.error(`[Server Error] ${msg}`);
      }
    });
    serverProc.stderr.on('data', (d) => console.error(`[Server STDERR] ${d.toString()}`));
    
    const started = await waitForServer(3000, 30);
    if (!started) {
      console.error('❌ Failed to start server in time.');
      if (serverProc) serverProc.kill();
      process.exit(1);
    }
    console.log('✅ Server started successfully!\n');
  } else {
    console.log('✅ Server is already running.\n');
  }

  try {
    // 1. Compliance Test
    await runScript(path.join(__dirname, 'compliance.js'));
    
    // 2. Integration Tests
    // Note: Node 20 natively supports --test runner.
    await runScript(path.join(__dirname, 'integration.js'));
    
    // 3. Load Test
    await runScript(path.join(__dirname, 'load-test.js'));
    
    console.log(`\n🎉 ALL TESTS PASSED SUCCESSFULLY!`);
  } catch (err) {
    console.error(`\n❌ TEST SUITE FAILED: ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (serverProc) {
      console.log('🔄 Shutting down test server...');
      serverProc.kill();
    }
  }
}

main();
