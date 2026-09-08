# CLI reference

Resolve `scripts/compress.cjs` relative to the Skill folder. Node.js 20.9+ is required. All image processing is local; first-use npm setup downloads Sharp into this Skill's node_modules and uses this Skill's .npm-cache. A relocated Skill should be copied without node_modules so the destination installs its own native dependencies.

| Option | Meaning |
| --- | --- |
| `--mode lossless` | Default. Verify identical decoded RGBA pixels; JPEG is skipped. |
| `--mode balanced` | Lossy, quality 80. |
| `--mode small` | Lossy, quality 60. |
| `--quality 1..100` | Override lossy quality; cannot accompany lossless. Not a size-reduction percentage. |
| `--output-dir DIR` | Write copies here, preserving paths relative to each input folder. Different inputs with colliding names receive numbered copies. |
| `--suffix .min` | Copy suffix; conflicts become `.min.1`, `.min.2`, etc. |
| `--dry-run` | List candidates and current file sizes without setup, decoding or writing images. |
| `--setup` | Prepare Sharp only. |
| `--` | Treat all subsequent arguments as input paths. |

Directory scans include subfolders and skip .git, node_modules, .npm-cache, nested output directory and symbolic links. Current-suffix copies are skipped. Input overlap is deduplicated. No glob expansion is performed by the CLI; pass explicit paths or directories. Maximum discovery: 100000 entries / 10000 candidates. A discovery failure aborts before image writes. Per-image processing failures continue with other files.

Only static PNG/JPEG/WebP/AVIF whose content matches the extension are supported. Multi-page/animated images and non-8-bit images are skipped. Each input is limited to 64 MiB / 40 million pixels; encoding has a 60-second limit. No resize, orientation transform, format conversion, deletion or reference rewriting. Metadata is retained using Sharp keepMetadata, including supported EXIF/ICC information; arbitrary unknown metadata is not guaranteed byte-for-byte preserved. Lossless describes decoded pixels, not identical file bytes or a smaller-file guarantee.

Copies are created exclusively, never overwriting an existing file. Outputs that are not smaller are discarded in memory. Original bytes are checked again before creating a copy; changed sources are skipped. Originals are always left untouched. Cancelling between images leaves completed copies and marks remaining candidates `cancelled`; the current image may finish.

Stdout JSON has `schemaVersion`, `mode`, `dryRun`, `cancelled`, `summary` and `results`. Each result contains `input`, `status` and relevant size/output fields, or a `reason`/`message`. Statuses: `compressed`, `skipped`, `failed`, `planned`. Common reasons: `not_smaller`, `jpeg_lossless_unsupported`, `already_compressed_copy`, `animated_or_multipage`, `source_changed`. Summary byte totals and saved percentage only include successfully compressed files, and mean potential savings from using those copies; originals still exist, so creating copies initially uses more disk space.

Exit codes: 0 completed without failed items (check skips/cancellation), 1 per-file failures, 2 setup/arguments/discovery errors. Do not hide failures or automatically switch from lossless to lossy. Missing Node/npm, installation failure or a read-only Skill directory should be reported plainly. If setup is interrupted, confirm no installer is running before removing a stale .setup.lock. Do not modify a user's project dependencies to repair Skill setup.
