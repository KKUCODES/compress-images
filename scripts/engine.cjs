const fs = require('node:fs/promises');
const path = require('node:path');
const supported = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);
const ignored = new Set(['.git', 'node_modules', '.npm-cache']);
const maxBytes = 64 * 1024 * 1024;
const maxPixels = 40 * 1000 * 1000;

function isCopy(filename, suffix) {
  const name = path.basename(filename, path.extname(filename));
  const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped}(?:\\.\\d+)?$`).test(name);
}

async function discover(inputs, options) {
  const items = [], seen = new Set();
  let visited = 0;
  const visit = async (filename, base, explicit) => {
    if (++visited > 100000 || items.length >= 10000) throw new Error('Discovery limit reached (100000 entries or 10000 candidates); choose a smaller folder.');
    const stat = await fs.lstat(filename);
    if (stat.isSymbolicLink()) {
      if (explicit) items.push({ input: filename, status: 'skipped', reason: 'symbolic_link' });
      return;
    }
    if (stat.isDirectory()) {
      if (!explicit && (ignored.has(path.basename(filename)) || filename === options.outputDir)) return;
      const directory = await fs.opendir(filename);
      for await (const entry of directory) await visit(path.join(filename, entry.name), base, false);
      return;
    }
    if (!stat.isFile()) return;
    if (!supported.has(path.extname(filename).toLowerCase())) {
      if (explicit) items.push({ input: filename, status: 'skipped', reason: 'unsupported_extension' });
      return;
    }
    const identity = await fs.realpath(filename);
    const key = process.platform === 'win32' ? identity.toLowerCase() : identity;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ input: filename, relative: path.relative(base, filename), beforeBytes: stat.size,
      ...(isCopy(filename, options.suffix) ? { status: 'skipped', reason: 'already_compressed_copy' } : {}) });
  };
  for (const input of inputs) {
    const filename = path.resolve(input);
    const stat = await fs.lstat(filename);
    await visit(filename, stat.isDirectory() ? filename : path.dirname(filename), true);
  }
  return items.sort((a, b) => a.input.localeCompare(b.input));
}

function settings(mode, quality, format) {
  const lossless = mode === 'lossless';
  const value = quality ?? (mode === 'small' ? 60 : 80);
  if (format === 'png') return lossless ? { compressionLevel: 9, adaptiveFiltering: true, palette: false } : { compressionLevel: 9, palette: true, quality: value, effort: 7 };
  if (format === 'jpeg') return { quality: value, mozjpeg: true };
  if (format === 'webp') return { lossless, quality: value, effort: 6, ...(lossless ? { exact: true } : {}) };
  return { lossless, quality: value, effort: 6, chromaSubsampling: lossless ? '4:4:4' : '4:2:0' };
}

async function encode(sharp, source, extension, options) {
  const input = () => sharp(source, { failOn: 'warning', limitInputPixels: maxPixels });
  const metadata = await input().metadata();
  const expected = extension === '.jpg' || extension === '.jpeg' ? 'jpeg' : extension.slice(1);
  const format = metadata.format === 'heif' && metadata.compression === 'av1' ? 'avif' : metadata.format;
  if (format !== expected) return { reason: 'format_extension_mismatch' };
  if ((metadata.pages || 1) > 1) return { reason: 'animated_or_multipage' };
  if (metadata.depth !== 'uchar') return { reason: 'unsupported_bit_depth' };
  const requested = options.format ?? 'original';
  const formats = [...new Set((requested === 'auto' ? options.formats ?? ['original', 'webp', 'avif'] : [requested])
    .map(value => value === 'original' ? format : value))];
  const transparent = formats.includes('jpeg') && metadata.hasAlpha && !(await input().stats()).isOpaque;
  const originalPixels = options.mode === 'lossless' ? await input().ensureAlpha().raw().toBuffer() : undefined;
  const candidates = [];
  let best;
  for (const target of formats) {
    if (options.mode === 'lossless' && target === 'jpeg') {
      candidates.push({ format: target, status: 'skipped', reason: 'jpeg_lossless_unsupported' });
      continue;
    }
    if (target === 'jpeg' && transparent && !options.background) {
      candidates.push({ format: target, status: 'skipped', reason: 'jpeg_background_required' });
      continue;
    }
    try {
      // 每个候选独立从原图编码，避免连续转码累积损失；只保留最小候选的缓冲区。
      let pipeline = input().keepMetadata();
      if (target === 'jpeg' && options.background) pipeline = pipeline.flatten({ background: options.background });
      const output = await pipeline.toFormat(target, settings(options.mode, options.quality, target)).timeout({ seconds: 60 }).toBuffer();
      const decoded = sharp(output, { failOn: 'warning', limitInputPixels: maxPixels });
      const after = await decoded.metadata();
      const actualFormat = after.format === 'heif' && after.compression === 'av1' ? 'avif' : after.format;
      // 保留方向与色彩等元数据；不通过去掉方向标签换取更小文件。
      if (actualFormat !== target || after.width !== metadata.width || after.height !== metadata.height || (after.orientation || 1) !== (metadata.orientation || 1)) throw new Error('Output format, dimensions or orientation changed.');
      if (originalPixels) {
        const outputPixels = await decoded.ensureAlpha().raw().toBuffer();
        if (!originalPixels.equals(outputPixels)) {
          candidates.push({ format: target, status: 'skipped', reason: 'lossless_verification_failed' });
          continue;
        }
      } else {
        // 实际解码，不能只凭文件头认定输出可读。
        await decoded.stats();
      }
      candidates.push({ format: target, status: 'encoded', bytes: output.length });
      if (!best || output.length < best.output.length) best = { output, outputFormat: target };
    } catch (error) {
      candidates.push({ format: target, status: 'failed', reason: 'encoding_failed', message: error.message });
    }
  }
  if (!best && candidates.some(candidate => candidate.status === 'failed')) {
    return { failed: true, reason: 'no_valid_output', inputFormat: format, candidates };
  }
  return best ? { ...best, inputFormat: format, candidates }
    : { reason: candidates[0]?.reason ?? 'no_valid_output', inputFormat: format, candidates };
}

async function writeCopy(item, output, options, outputFormat, inputFormat) {
  const destination = options.outputDir ? path.join(options.outputDir, item.relative) : item.input;
  const originalExtension = path.extname(destination);
  const extension = outputFormat === inputFormat ? originalExtension : `.${outputFormat === 'jpeg' ? 'jpg' : outputFormat}`;
  const stem = destination.slice(0, -originalExtension.length);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  for (let index = 0; index < 10000; index++) {
    const filename = `${stem}${options.suffix}${index ? `.${index}` : ''}${extension}`;
    let handle;
    try { handle = await fs.open(filename, 'wx'); }
    catch (error) { if (error.code === 'EEXIST') continue; throw error; }
    try {
      await handle.writeFile(output);
      await handle.close();
      return filename;
    } catch (error) {
      const owned = await handle.stat().catch(() => undefined);
      await handle.close().catch(() => {});
      const current = await fs.lstat(filename).catch(() => undefined);
      if (owned && current && owned.ino === current.ino && owned.dev === current.dev && !current.isSymbolicLink()) await fs.unlink(filename).catch(() => {});
      throw error;
    }
  }
  throw new Error('Too many filename conflicts. Choose another output directory or suffix.');
}

async function compressOne(sharp, item, options) {
  try {
    const stat = await fs.lstat(item.input);
    if (!stat.isFile() || stat.isSymbolicLink()) return { ...item, status: 'skipped', reason: 'source_changed' };
    if (stat.size > maxBytes) return { ...item, status: 'skipped', reason: 'file_too_large' };
    const source = await fs.readFile(item.input);
    if (source.length > maxBytes) return { ...item, status: 'skipped', reason: 'file_too_large' };
    const { output, reason, failed, inputFormat, outputFormat, candidates } = await encode(sharp, source, path.extname(item.input).toLowerCase(), options);
    const result = { ...item, beforeBytes: source.length, inputFormat, candidates };
    if (reason) return { ...result, status: failed ? 'failed' : 'skipped', reason };
    const converted = inputFormat !== outputFormat;
    // 指定转换格式时，格式本身也是交付目标；自动模式仍只接受体积下降。
    const explicitConversion = converted && options.format && !['auto', 'original'].includes(options.format);
    if (!explicitConversion && output.length >= source.length) return { ...result, status: 'skipped', reason: 'not_smaller' };
    const current = await fs.lstat(item.input);
    if (!current.isFile() || current.isSymbolicLink() || current.size > maxBytes || !(await fs.readFile(item.input)).equals(source)) return { ...result, status: 'skipped', reason: 'source_changed' };
    const filename = await writeCopy(item, output, options, outputFormat, inputFormat);
    return { ...result, status: converted ? 'converted' : 'compressed', outputFormat, output: filename, afterBytes: output.length, savedBytes: source.length - output.length };
  } catch (error) {
    return { ...item, status: 'failed', reason: 'compression_failed', message: error.message };
  }
}

async function runBatch(sharp, items, options, cancelled = () => false, progress = () => {}) {
  const results = [];
  for (const item of items) {
    if (item.status) results.push(item);
    else if (cancelled()) results.push({ ...item, status: 'skipped', reason: 'cancelled' });
    else if (options.dryRun) results.push({ ...item, status: 'planned' });
    else results.push(await compressOne(sharp, item, options));
    progress(results.length, items.length);
  }
  const successes = results.filter(item => ['compressed', 'converted'].includes(item.status));
  const beforeBytes = successes.reduce((sum, item) => sum + item.beforeBytes, 0);
  const afterBytes = successes.reduce((sum, item) => sum + item.afterBytes, 0);
  return { schemaVersion: 2, mode: options.mode, format: options.format ?? 'original', formats: options.format === 'auto' ? options.formats ?? ['original', 'webp', 'avif'] : undefined, dryRun: options.dryRun, cancelled: cancelled(),
    summary: { total: results.length, compressed: results.filter(item => item.status === 'compressed').length, converted: results.filter(item => item.status === 'converted').length, skipped: results.filter(item => item.status === 'skipped').length,
      failed: results.filter(item => item.status === 'failed').length, planned: results.filter(item => item.status === 'planned').length,
      beforeBytes, afterBytes, savedBytes: beforeBytes - afterBytes, savedPercent: beforeBytes ? Number(((beforeBytes - afterBytes) / beforeBytes * 100).toFixed(2)) : 0 },
    results: results.map(({ relative, ...item }) => item) };
}

module.exports = { discover, runBatch, encode };
