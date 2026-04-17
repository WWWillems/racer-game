---
name: image-generation
description: "Generate images using Google Gemini's image generation capabilities. Use when you need to: (1) Generate preview/example images for style presets, (2) Test image generation prompts locally, (3) Batch-generate images and save them to disk. Triggers on: 'generate style previews', 'test image generation', 'create example images', 'style preset images'."
---

## Overview

Standalone script that uses Google Gemini `gemini-3.1-flash-image-preview` via the AI SDK to generate images and save them to disk. Primarily used to create example images that showcase each style preset's distinct visual treatment.

## Dependencies

All already installed in the project — no new packages required:

- `ai` (^6.0.97) — AI SDK core
- `@ai-sdk/google` (^3.0.30) — Google Gemini provider
- `dotenv` (^16.4.7) — loads `.env` for the API key
- `tsx` (^4.19.3) — runs TypeScript directly

Requires `GOOGLE_GENERATIVE_AI_API_KEY` in `.env`.

## Usage

Run from the project root:

```bash
# Generate all 12 style preset previews with the default subject
npx tsx .agents/skills/image-generation/generate-style-previews.ts

# Generate a single preset
npx tsx .agents/skills/image-generation/generate-style-previews.ts --preset=cinematic

# Custom subject
npx tsx .agents/skills/image-generation/generate-style-previews.ts --subject="A cat sitting on a windowsill watching the rain"

# Custom output directory
npx tsx .agents/skills/image-generation/generate-style-previews.ts --output=./public/style-previews

# Combine flags
npx tsx .agents/skills/image-generation/generate-style-previews.ts --preset=anime --subject="A mountain landscape at sunset"
```

## Output

Images are saved to `.agents/skills/image-generation/output/` by default, named `{preset}.{ext}` (e.g. `cinematic.png`, `kawaii.jpg`). The file extension is determined by the MIME type Gemini returns.

## How It Works

1. Loads the style preset prompt from `shared/model/style-preset-prompts.ts`
2. Sends the style guidance as the system prompt to Gemini Flash image generation
3. Uses `responseModalities: ["IMAGE"]` to get raw image output
4. Decodes the base64 response and writes it to disk
