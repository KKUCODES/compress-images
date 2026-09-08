const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');

function checkNode() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 20 || (major === 20 && minor < 9)) throw new Error('Node.js 20.9 or later is required.');
}

function loadSharp() {
  const installed = path.join(root, 'node_modules/sharp');
  const manifest = JSON.parse(fs.readFileSync(path.join(installed, 'package.json'), 'utf8'));
  const expected = require('../package.json').dependencies.sharp;
  if (manifest.version !== expected) throw new Error(`Expected Sharp ${expected}, found ${manifest.version}.`);
  return require(installed);
}

function findNpm() {
  const candidates = [process.env.npm_execpath, path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')];
  for (const directory of (process.env.PATH || '').split(path.delimiter)) {
    candidates.push(path.join(directory, 'node_modules/npm/bin/npm-cli.js'));
    try { candidates.push(fs.realpathSync(path.join(directory, 'npm'))); } catch {}
  }
  return candidates.find(filename => filename && /npm-cli\.js$/.test(filename) && fs.existsSync(filename));
}

async function ensureSharp() {
  checkNode();
  try { return loadSharp(); } catch {}
  const lockPath = path.join(root, '.setup.lock');
  let lock;
  const deadline = Date.now() + 120000;
  while (lock === undefined) {
    try { lock = fs.openSync(lockPath, 'wx'); }
    catch (error) {
      if (error.code !== 'EEXIST') throw new Error(`Skill directory is not writable: ${error.message}`);
      if (Date.now() >= deadline) throw new Error('Another setup is running, or .setup.lock was left after interruption. Wait for setup; remove a stale lock only after confirming no installer is running.');
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  try {
    try { return loadSharp(); } catch {}
    const npm = findNpm();
    if (!npm) throw new Error('npm was not found alongside Node.js or on PATH. Install Node.js with npm, then retry.');
    process.stderr.write('Preparing Sharp in the Skill directory (first use requires network)...\n');
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [npm, 'ci', '--omit=dev', '--include=optional', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', path.join(root, '.npm-cache')], {
        cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
      });
      child.stdout.pipe(process.stderr, { end: false });
      child.stderr.pipe(process.stderr, { end: false });
      const timeout = setTimeout(() => { child.kill(); }, 180000);
      child.on('error', error => { clearTimeout(timeout); reject(error); });
      child.on('exit', code => { clearTimeout(timeout); code === 0 ? resolve() : reject(new Error(`Sharp setup failed (exit ${code}). Check npm/network and retry; no images were changed.`)); });
    });
    return loadSharp();
  } finally {
    fs.closeSync(lock);
    fs.unlinkSync(lockPath);
  }
}
module.exports = { ensureSharp, checkNode };
