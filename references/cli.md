# CLI reference

Resolve `scripts/compress.cjs` relative to the Skill folder. Node.js 20.9+ is required. All image processing is local; first-use npm setup downloads Sharp into this Skill's node_modules and uses this Skill's .npm-cache. A relocated Skill should be copied without node_modules so the destination installs its own native dependencies.

| Option | Meaning |
| --- | --- |
| `--mode lossless` | Default. Verify identical decoded RGBA pixels; JPEG output is skipped (explicit JPEG is an argument error). JPEG input can convert to a lossless target. |
| `--mode balanced` | Lossy, quality 80. |
| `--mode small` | Lossy, quality 60. |
| `--quality 1..100` | Override lossy quality; cannot accompany lossless. Not a size-reduction percentage. |
| `--format original` | Default. Compress in the original format, saving only a smaller copy. |
| `--format png\|jpeg\|webp\|avif` | Convert to the specified format. `jpg` aliases `jpeg`. Changed-format output is saved even if larger; same-format requests still require smaller output. |
| `--format auto` | Compare actual encodings of original format, WebP and AVIF. Save the smallest verified candidate only if smaller than the source. |
| `--formats original,webp,avif` | Auto-only allowlist, replacing default candidates. Can include png/jpeg/webp/avif or original; duplicates are removed. Ties follow list order. |
| `--background "#ffffff"` | JPEG-only explicit opaque background, required if input actually contains transparency. Auto never flattens transparency. |
| `--output-dir DIR` | Write copies here, preserving paths relative to each input folder. Different inputs with colliding names receive numbered copies. |
| `--suffix .min` | Copy suffix; conflicts become `.min.1`, `.min.2`, etc. |
| `--dry-run` | List candidates and current file sizes without setup, decoding or writing images. |
| `--setup` | Prepare Sharp only. |
| `--` | Treat all subsequent arguments as input paths. |

Directory scans include subfolders and skip .git, node_modules, .npm-cache, nested output directory and symbolic links. Current-suffix copies are skipped. Input overlap is deduplicated. No glob expansion is performed by the CLI; pass explicit paths or directories. Maximum discovery: 100000 entries / 10000 candidates. A discovery failure aborts before image writes. Per-image processing failures continue with other files.

Only static PNG/JPEG/WebP/AVIF whose content matches the extension are supported. Multi-page/animated images and non-8-bit images are skipped. Each input is limited to 64 MiB / 40 million pixels; each candidate encoding has a 60-second limit, so auto can take longer. No resize, orientation transform, deletion or reference rewriting. Metadata is retained using Sharp keepMetadata, including supported EXIF/ICC information; arbitrary unknown metadata is not guaranteed byte-for-byte preserved. Lossless describes decoded pixels, not identical file bytes or a smaller-file guarantee. It cannot restore detail lost before conversion.

Each candidate is independently encoded from the source and decoded to validate format, dimensions and orientation; lossless mode also compares pixels. A skipped or failed candidate does not prevent auto from evaluating the rest. All encoder failures with no valid output mark the image failed; purely ineligible candidates mark it skipped. The smallest result is among successfully verified candidates, not a claim about all possible settings or equal perceived quality across formats.

Copies are created exclusively, never overwriting an existing file. Changed formats use the corresponding extension (JPEG uses .jpg), preserving folder structure and numbering collisions. Outputs that are not smaller are discarded except for explicitly requested changed-format conversion. Original bytes are checked again before creating a copy; changed sources are skipped. Originals are always left untouched. Cancelling between images leaves completed copies and marks remaining inputs `cancelled`; the current image and its candidate encodings may finish.

Stdout JSON schema v2 has `schemaVersion`, `mode`, `format`, optional auto `formats`, `dryRun`, `cancelled`, `summary` and `results`. Statuses: `compressed` (same format), `converted` (changed format), `skipped`, `failed`, `planned`. Successful results include `inputFormat`, `outputFormat`, actual `output` path and byte sizes. `candidates` records each attempted format with status encoded/skipped/failed and bytes or reason/message. Common reasons include `not_smaller`, `jpeg_lossless_unsupported`, `jpeg_background_required`, `lossless_verification_failed`, `no_valid_output`, `already_compressed_copy`, `animated_or_multipage`, `source_changed`.

Summary has separate compressed/converted counts. Byte totals include both, and negative savedBytes/savedPercent indicate growth from explicit conversion. Savings are potential savings from using those copies; originals remain, so creating copies initially uses more disk space. Dry-run only discovers files and records requested formats; it does not inspect transparency, encode candidates or predict the winner.

Examples (paths are placeholders):

```sh
node scripts/compress.cjs --format webp -- "/path/to/image.png"
node scripts/compress.cjs --format auto --formats original,webp --mode balanced -- "/path/to/images"
node scripts/compress.cjs --format jpeg --mode balanced --background "#ffffff" -- "/path/to/transparent.png"
```

Exit codes: 0 completed without failed items (check skips/cancellation), 1 per-file failures, 2 setup/arguments/discovery errors. Do not hide failures or automatically switch from lossless to lossy. Missing Node/npm, installation failure or a read-only Skill directory should be reported plainly. If setup is interrupted, confirm no installer is running before removing a stale .setup.lock. Do not modify a user's project dependencies to repair Skill setup.
