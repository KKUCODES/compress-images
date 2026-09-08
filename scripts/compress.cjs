#!/usr/bin/env node
const path = require('node:path');
const { ensureSharp, checkNode } = require('./setup.cjs');
const { discover, runBatch } = require('./engine.cjs');

function parse(args) {
  const options = { mode: 'lossless', suffix: '.min', dryRun: false };
  const inputs = [];
  let positional = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (positional) { inputs.push(arg); continue; }
    if (arg === '--') { positional = true; continue; }
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--setup') { options.setup = true; continue; }
    if (arg === '--dry-run') { options.dryRun = true; continue; }
    const key = { '--mode': 'mode', '--quality': 'quality', '--suffix': 'suffix', '--output-dir': 'outputDir' }[arg];
    if (key) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      options[key] = key === 'quality' ? Number(value) : value;
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else inputs.push(arg);
  }
  if (!['lossless', 'balanced', 'small'].includes(options.mode)) throw new Error('Mode must be lossless, balanced or small.');
  if (options.quality !== undefined && (!Number.isInteger(options.quality) || options.quality < 1 || options.quality > 100 || options.mode === 'lossless')) throw new Error('Quality must be 1..100 and requires balanced or small mode.');
  if (!/^\.[a-zA-Z0-9_-]+$/.test(options.suffix)) throw new Error('Suffix must start with a dot and contain only letters, numbers, underscores or hyphens.');
  if (options.outputDir) options.outputDir = path.resolve(options.outputDir);
  if (options.setup && (inputs.length || args.length !== 1)) throw new Error('--setup must be used alone.');
  if (!options.setup && !inputs.length) throw new Error('Provide at least one local image or directory.');
  return { options, inputs };
}

async function main() {
  try {
    checkNode();
    const parsed = parse(process.argv.slice(2));
    if (parsed.help) {
      process.stdout.write('Usage: node compress.cjs [--mode lossless|balanced|small] [--quality 1..100] [--output-dir DIR] [--suffix .min] [--dry-run] -- FILE_OR_DIR...\n       node compress.cjs --setup\nOutputs JSON. Originals are preserved. Folders include subfolders.\n');
      return;
    }
    const { inputs, options } = parsed;
    if (options.setup) {
      const sharp = await ensureSharp();
      process.stdout.write(JSON.stringify({ status: 'ready', sharpVersion: sharp.versions.sharp, runtimeDirectory: path.resolve(__dirname, '..') }) + '\n');
      return;
    }
    const items = await discover(inputs, options);
    const sharp = !options.dryRun && items.some(item => !item.status) ? await ensureSharp() : undefined;
    let cancelled = false;
    const stop = () => { cancelled = true; process.stderr.write('Stopping after the current image...\n'); };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    try {
      const report = await runBatch(sharp, items, options, () => cancelled, (done, total) => {
        if (!options.dryRun) process.stderr.write(`${done}/${total}\n`);
      });
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
      process.exitCode = report.summary.failed ? 1 : 0;
    } finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); }
  } catch (error) {
    process.stdout.write(JSON.stringify({ schemaVersion: 1, error: { message: error.message } }) + '\n');
    process.exitCode = 2;
  }
}
if (require.main === module) void main();
module.exports = { parse };
