---
name: compress-images
description: Compress or convert local PNG, JPEG, WebP and AVIF images with Sharp, individually or in folders. Use for image compression, format conversion, or choosing a smaller image format. Preserves originals; supports lossless and lossy presets.
---

# Compress images

Use the bundled CLI instead of writing a new compressor. Resolve all script paths relative to this SKILL.md, regardless of the user's project directory. Quote file paths when invoking commands.

## Choose the operation

- Reuse the user's paths and quality requirements. Ask only if the intended files or permission to use lossy compression is unclear and matters to the task.
- Default `--mode lossless` verifies decoded pixel equality. JPEG output is unsupported in lossless mode, but JPEG input can be converted losslessly to PNG/WebP/AVIF if verification passes; this does not restore detail already lost in the source. For permission to trade quality for size, use `balanced` (80), `small` (60), or `--quality 1..100` with either lossy mode.
- Default `--format original` keeps the format. For an explicit conversion request, use `--format png|jpeg|webp|avif`. Conversion to a different format is delivered even if larger; report the increase instead of claiming savings.
- When the user allows format changes to reduce size, use `--format auto`. It compares original-format, WebP and AVIF encodings and saves the smallest verified result only if smaller than the source. Use `--formats original,webp` or another allowlist for compatibility requirements. It can retain the original format; WebP is not always smallest. If format permission is unclear, keep the format or ask when conversion matters.
- Preserve transparency. Transparent input to JPEG requires lossy mode and an explicit `--background "#RRGGBB"`; ask for the background if unspecified. Auto skips JPEG for transparent inputs and never silently flattens them.
- Quality is an encoder setting, not a promised size reduction or equivalent visual quality across codecs. Honor the user's quality and target-format requirements; auto is a byte-size comparison, not a perceptual-quality assessment.
- Outputs keep dimensions and originals. Copies use `.min`, the selected extension, and a number on collision. Code references are not changed. For project assets, explain that changed extensions require reference updates before replacing originals; perform such updates only within the user's requested scope, separately from this CLI.

## Run

Node.js 20.9+ and npm must be available. The first real compression automatically installs the locked Sharp dependency inside this Skill directory. It requires network and a writable Skill directory; later use is offline. Do not install Sharp globally or in the user's project. If Node/npm, network or write access is unavailable, explain the specific blocker without changing unrelated environment settings.

```sh
node "<skill-directory>/scripts/compress.cjs" --dry-run -- "/absolute/path/to/images"
node "<skill-directory>/scripts/compress.cjs" --mode lossless -- "/absolute/path/to/photo.png"
node "<skill-directory>/scripts/compress.cjs" --mode balanced --quality 80 -- "/absolute/path/to/images"
node "<skill-directory>/scripts/compress.cjs" --format webp -- "/absolute/path/to/photo.png"
node "<skill-directory>/scripts/compress.cjs" --format auto --formats original,webp --mode balanced -- "/absolute/path/to/images"
```

`--dry-run` only discovers files and reads sizes, without installing dependencies or writing images. A directory includes subfolders. Multiple input paths can follow `--`. Use absolute paths to avoid confusing the Skill location with the project location.

For an output directory, troubleshooting, metadata limits or JSON details, read [references/cli.md](references/cli.md). Run `--help` for available options; `--setup` prepares Sharp without compressing files.

## Read the result

Stdout is one JSON object; diagnostic progress goes to stderr. Schema v2 separates `compressed` (same format) and `converted` (changed format). Summarize both counts, input/output formats, size change, output locations and skipped/failed images in the user's language. Negative `savedBytes`/`savedPercent` mean growth. Inspect `candidates` for skipped or failed encoders; if some failed, say the choice is smallest among successful candidates. Report that originals remain intact. Do not claim unchanged images were compressed or silently retry with lower quality.

Exit 0 means no failed items (skips can still occur), 1 means partial failure, and 2 means invalid arguments or a setup/discovery failure. Inspect `results` even on nonzero exits. Cancellation stops between images and reports completed work. Read output file paths from JSON rather than predicting names.
