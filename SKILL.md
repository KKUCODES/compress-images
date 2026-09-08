---
name: compress-images
description: Compress local PNG, JPEG, WebP and AVIF images with Sharp, individually or in folders, and report size savings. Use when the user asks to compress images or reduce image file sizes locally. Preserves originals; supports lossless and lossy presets.
---

# Compress images

Use the bundled CLI instead of writing a new compressor. Resolve all script paths relative to this SKILL.md, regardless of the user's project directory. Quote file paths when invoking commands.

## Choose the operation

- Reuse the user's paths and quality requirements. Ask only if the intended files or permission to use lossy compression is unclear and matters to the task.
- Default `--mode lossless` preserves decoded pixels and skips JPEG because Sharp cannot guarantee lossless JPEG recompression. For an explicit request to trade quality for smaller files, choose `balanced` (quality 80) or `small` (quality 60), or pass `--quality 1..100` with either lossy mode.
- Quality is an encoder setting, not a promised percentage reduction. A file may already be optimized.
- Outputs keep the original format, dimensions and originals. Copies use `.min` plus a number on collision. No source-code references are changed. Requests to replace originals or update references require a separate, user-authorized workflow; do not claim this CLI performs them.

## Run

Node.js 20.9+ and npm must be available. The first real compression automatically installs the locked Sharp dependency inside this Skill directory. It requires network and a writable Skill directory; later use is offline. Do not install Sharp globally or in the user's project. If Node/npm, network or write access is unavailable, explain the specific blocker without changing unrelated environment settings.

```sh
node "<skill-directory>/scripts/compress.cjs" --dry-run -- "/absolute/path/to/images"
node "<skill-directory>/scripts/compress.cjs" --mode lossless -- "/absolute/path/to/photo.png"
node "<skill-directory>/scripts/compress.cjs" --mode balanced --quality 80 -- "/absolute/path/to/images"
```

`--dry-run` only discovers files and reads sizes, without installing dependencies or writing images. A directory includes subfolders. Multiple input paths can follow `--`. Use absolute paths to avoid confusing the Skill location with the project location.

For an output directory, troubleshooting, metadata limits or JSON details, read [references/cli.md](references/cli.md). Run `--help` for available options; `--setup` prepares Sharp without compressing files.

## Read the result

Stdout is one JSON object; diagnostic progress goes to stderr. Summarize successful count, total saved bytes/percentage for successful images, output locations and any skipped/failed images, in the user's language. Report that originals remain intact. Do not claim unchanged images were compressed or silently retry with lower quality.

Exit 0 means no failed items (skips can still occur), 1 means partial failure, and 2 means invalid arguments or a setup/discovery failure. Inspect `results` even on nonzero exits. Cancellation stops between images and reports completed work. Read output file paths from JSON rather than predicting names.
