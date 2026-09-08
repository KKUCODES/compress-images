# Compress Images

**Local image compression for AI agents, powered by Sharp.**

Compress PNG, JPEG, WebP and AVIF images individually or in batches. Choose lossless or lossy compression and keep your originals. No API key. No image uploads.

[English](#english) · [简体中文](#简体中文)

## English

### Just ask your agent

> Use compress-images to losslessly compress all images in `/path/to/images`.

> Compress `/path/to/photo.jpg`. Some quality loss is OK; keep the original.

The agent reports output paths, file sizes and skipped images. Folders include subfolders. Automatic Skill discovery depends on your agent.

### Install

Requires **Node.js 20.9+**, **npm**, and an agent that supports Skills and can run local commands.

1. Download or clone this repository.
2. Place it in your agent's Skills directory as `compress-images`. Ensure the layout is `compress-images/SKILL.md`, without an extra nested folder.
3. Load the Skill using your agent's instructions, then ask it to compress an image or folder.

On first use, Sharp is downloaded into this Skill's folder, which must be writable. Later runs can work offline. Nothing is installed globally or added to your project's dependencies.

### Choose a mode

| Mode | Behavior |
| --- | --- |
| `lossless` (default) | Verifies identical decoded pixels; skips JPEG |
| `balanced` | Lossy compression, quality 80 |
| `small` | Lower quality to prioritize smaller files, quality 60 |

Lossy quality can be set from 1 to 100. **Quality 80 does not mean an 80% reduction in file size.** Results depend on the source image.

### What happens to my files?

- Originals stay untouched. Smaller copies use names such as `photo.min.png`; existing files are never overwritten.
- If compression does not make an image smaller, no copy is written.
- Format and dimensions stay the same. Code references are not changed.
- Reported savings describe using the compressed copies. Keeping both versions initially takes more disk space.

Supports static 8-bit PNG, JPEG, WebP and AVIF. Animated, multipage and high-bit-depth images are skipped. Tested on Windows x64; macOS, Linux and discovery in other agents have not been verified.

### Run without an agent

From this repository's folder:

```sh
# Preview files without installing Sharp or writing images
node scripts/compress.cjs --dry-run -- "/path/to/images"

# Lossless compression
node scripts/compress.cjs --mode lossless -- "/path/to/image.png"

# Batch compression with some quality loss
node scripts/compress.cjs --mode balanced --quality 80 -- "/path/to/images"
```

See the [CLI reference](references/cli.md) for output folders, size limits and JSON results.

## 简体中文

**让 AI Agent 帮你压缩图片。** 基于 Sharp 在本地处理 PNG、JPEG、WebP 和 AVIF，支持单张和文件夹批量压缩。无需 API Key，图片无需上传。

### 一句话开始压缩

> 使用 compress-images，无损压缩 `/path/to/images` 文件夹下的所有图片。

> 压缩 `/path/to/photo.jpg`，允许适当降低画质，保留原图。

Agent 会告诉你生成文件的位置、压缩前后大小，以及哪些图片被跳过。文件夹包含子文件夹；能否自动触发取决于所用 Agent。

### 安装

需要 **Node.js 20.9+**、**npm**，以及支持 Skills 且能执行本地命令的 Agent。

1. 下载或克隆本仓库。
2. 将文件夹命名为 `compress-images`，放入 Agent 的 Skills 目录。确保路径为 `compress-images/SKILL.md`，不要多套一层文件夹。
3. 按所用 Agent 的方式加载 Skill，然后告诉它要压缩的图片或文件夹路径。

首次使用会联网下载 Sharp 到本 Skill 目录，之后可离线压缩。该目录需要可写；不会全局安装，也不会修改你项目的依赖。

### 选择压缩方式

| 模式 | 处理方式 |
| --- | --- |
| 无损 `lossless`（默认） | 保持解码后的像素一致并校验；JPEG 会跳过 |
| 均衡 `balanced` | 允许一些画质损失，质量参数 80 |
| 更小体积 `small` | 更看重文件大小，质量参数 60 |

有损模式可指定 1～100 的质量参数。**质量 80 不代表体积缩小 80%。** 实际效果取决于原图。

### 压缩后会发生什么？

- 保留原图，生成如 `photo.min.png` 的副本。遇到重名自动编号，不覆盖已有文件。
- 没有变小则不生成副本。
- 保持格式和尺寸，不修改代码引用。
- 节省空间指换用副本后的潜在节省；同时保留原图和副本会增加磁盘占用。

支持静态、8-bit 的 PNG、JPEG、WebP 和 AVIF；动画、多页和高位深图片会跳过。目前已在 Windows x64 验证，macOS、Linux 实机及其他 Agent 的自动发现尚未验证。

也可以直接使用上方命令运行，无需 Agent。输出目录、大小限制和结果字段见 [CLI 说明（英文）](references/cli.md)。
