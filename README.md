# Compress Images

**Local image compression for AI agents, powered by Sharp.**

Compress and convert PNG, JPEG, WebP and AVIF images individually or in batches. Keep the original format, choose a target, or compare formats for a smaller file. No API key. No image uploads. Originals are preserved.

[English](#english) · [简体中文](#简体中文)

## English

### Just ask your agent

> Use compress-images to losslessly compress all images in `/path/to/images`.

> Compress `/path/to/photo.jpg`. Some quality loss is OK; keep the original.

> Convert all PNG images in `/path/to/images` to lossless WebP.

> These images are for a website that supports WebP and AVIF. Some quality loss and format changes are OK; choose the smallest result.

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
| `lossless` (default) | Verifies identical decoded pixels; JPEG output is unsupported |
| `balanced` | Lossy compression, quality 80 |
| `small` | Lower quality to prioritize smaller files, quality 60 |

Lossy quality can be set from 1 to 100. **Quality 80 does not mean an 80% reduction in file size.** Results depend on the source image.

### Choose a format

| Choice | Behavior |
| --- | --- |
| Keep original (default) | Compress without changing the extension |
| PNG / JPEG / WebP / AVIF | Convert to a specified format, even if the result is larger |
| Auto | Compare original-format, WebP and AVIF encodings; save the smallest verified result only if smaller than the source |

You can limit auto candidates for compatibility, such as original format and WebP only. The same quality number does not guarantee equal visual quality across formats. Lossless conversions verify decoded pixels, including JPEG input; they cannot restore previously lost detail. Transparent images require an explicit background color and lossy mode to convert to JPEG.

### What happens to my files?

- Originals stay untouched. Copies use names such as `photo.min.png` or `photo.min.webp`; existing files are never overwritten.
- Original-format compression and auto skip results that are not smaller. Explicit conversion to another format still creates the requested file and reports any size increase.
- Dimensions stay the same. Code references are not changed; update references separately before replacing project assets with a different extension.
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

# Convert to lossless WebP
node scripts/compress.cjs --format webp -- "/path/to/image.png"

# Compare original format and WebP with lossy compression
node scripts/compress.cjs --format auto --formats original,webp --mode balanced -- "/path/to/images"

# Convert a transparent image to JPEG with a white background
node scripts/compress.cjs --format jpeg --mode balanced --background "#ffffff" -- "/path/to/image.png"
```

See the [CLI reference](references/cli.md) for output folders, size limits and JSON results.

## 简体中文

**让 AI Agent 帮你压缩图片、转换格式。** 基于 Sharp 在本地处理 PNG、JPEG、WebP 和 AVIF，支持单张和文件夹批量操作，也能比较不同格式的实际体积。无需 API Key，图片无需上传，原图始终保留。

### 一句话开始压缩

> 使用 compress-images，无损压缩 `/path/to/images` 文件夹下的所有图片。

> 压缩 `/path/to/photo.jpg`，允许适当降低画质，保留原图。

> 把 `/path/to/images` 下的 PNG 全部无损转成 WebP。

> 这些图片用于支持 WebP 和 AVIF 的网页，允许换格式、适当降低画质，选择体积最小的结果。

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
| 无损 `lossless`（默认） | 保持解码后的像素一致并校验；不支持输出 JPEG |
| 均衡 `balanced` | 允许一些画质损失，质量参数 80 |
| 更小体积 `small` | 更看重文件大小，质量参数 60 |

有损模式可指定 1～100 的质量参数。**质量 80 不代表体积缩小 80%。** 实际效果取决于原图。

### 选择输出格式

| 方式 | 处理方式 |
| --- | --- |
| 保持格式（默认） | 在原格式内压缩，不改变扩展名 |
| 指定 PNG / JPEG / WebP / AVIF | 转成指定格式，即使变大也会生成并报告 |
| 自动选择 | 比较原格式、WebP、AVIF 的实际编码体积，只保存通过校验且比原图更小的最小结果 |

可以按兼容性限制候选，例如只比较原格式和 WebP。同一个质量数值不代表不同格式的视觉质量相同。JPEG 原图也能转成无损格式并校验像素，但不会恢复此前已丢失的细节。透明图片转 JPEG 需要允许有损并明确指定背景色。

### 压缩后会发生什么？

- 保留原图，生成如 `photo.min.png` 或 `photo.min.webp` 的副本。遇到重名自动编号，不覆盖已有文件。
- 保持格式和自动模式下，没有变小则不生成副本；明确转成另一种格式时，即使变大也会生成并如实报告。
- 保持尺寸，不修改代码引用。项目图片转换格式后，替换原资源前需要单独更新引用路径。
- 节省空间指换用副本后的潜在节省；同时保留原图和副本会增加磁盘占用。

支持静态、8-bit 的 PNG、JPEG、WebP 和 AVIF；动画、多页和高位深图片会跳过。目前已在 Windows x64 验证，macOS、Linux 实机及其他 Agent 的自动发现尚未验证。

也可以直接使用上方命令运行，无需 Agent。输出目录、大小限制和结果字段见 [CLI 说明（英文）](references/cli.md)。
