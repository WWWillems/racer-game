#!/usr/bin/env tsx

import "dotenv/config";

import * as fs from "node:fs";
import * as path from "node:path";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import {
	STYLE_PRESETS,
	type StylePreset,
} from "../../../entities/stylePresetEntity";
import { getStylePresetPrompt } from "../../../shared/model/style-preset-prompts";

const DEFAULT_SUBJECT =
	"A cozy café interior with a steaming cup of coffee on a wooden table by a rain-streaked window, warm ambient lighting";

const DEFAULT_OUTPUT_DIR = path.join(
	process.cwd(),
	".agents/skills/image-generation/output",
);

const MIME_TO_EXT: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/webp": "webp",
};

const parseArgs = () => {
	const args = process.argv.slice(2);

	const get = (flag: string): string | undefined => {
		const match = args.find((a) => a.startsWith(`--${flag}=`));
		return match?.split("=").slice(1).join("=");
	};

	const presetArg = get("preset");
	const subject = get("subject") ?? DEFAULT_SUBJECT;
	const outputDir = get("output") ?? DEFAULT_OUTPUT_DIR;

	let presets: StylePreset[];
	if (presetArg) {
		if (!STYLE_PRESETS.includes(presetArg as StylePreset)) {
			console.error(`Unknown preset: "${presetArg}"`);
			console.error(`Available: ${STYLE_PRESETS.join(", ")}`);
			process.exit(1);
		}
		presets = [presetArg as StylePreset];
	} else {
		presets = [...STYLE_PRESETS];
	}

	return { presets, subject, outputDir };
};

const generateImage = async (
	google: ReturnType<typeof createGoogleGenerativeAI>,
	preset: StylePreset,
	subject: string,
): Promise<{ base64: string; mediaType: string } | null> => {
	const styleGuidance = getStylePresetPrompt(preset);

	const result = await generateText({
		model: google("gemini-3.1-flash-image-preview"),
		system: `You are an image generation assistant. Generate a single image that precisely matches the requested visual style.

${styleGuidance}

Directives:
- Strictly follow the style guidelines above — the style is more important than photographic accuracy.
- Exclude any text overlays, watermarks, UI elements, or typography.
- Focus on the subject, environment, and the distinct visual treatment of the style.`,
		prompt: `Generate an image of: ${subject}`,
		providerOptions: {
			google: {
				responseModalities: ["IMAGE"],
				imageConfig: {
					aspectRatio: "9:16",
					imageSize: "1K",
				},
			},
		},
	});

	const file = result.files[0];
	if (!file?.base64) return null;

	return { base64: file.base64, mediaType: file.mediaType };
};

const main = async () => {
	const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
	if (!apiKey) {
		console.error("Missing GOOGLE_GENERATIVE_AI_API_KEY in .env");
		process.exit(1);
	}

	const { presets, subject, outputDir } = parseArgs();

	fs.mkdirSync(outputDir, { recursive: true });

	const google = createGoogleGenerativeAI({ apiKey });

	console.log(`Generating ${presets.length} style preview(s)`);
	console.log(`Subject: "${subject}"`);
	console.log(`Output:  ${outputDir}\n`);

	let succeeded = 0;
	let failed = 0;

	for (let index = 0; index < presets.length; index++) {
		const preset = presets[index];
		const label = `[${index + 1}/${presets.length}]`;
		process.stdout.write(`${label} ${preset}...`);

		try {
			const image = await generateImage(google, preset, subject);

			if (!image) {
				console.log(" no image returned");
				failed++;
				continue;
			}

			const ext = MIME_TO_EXT[image.mediaType] ?? "png";
			const filename = `${preset}.${ext}`;
			const filepath = path.join(outputDir, filename);

			fs.writeFileSync(
				filepath,
				new Uint8Array(Buffer.from(image.base64, "base64")),
			);
			console.log(` saved ${filename}`);
			succeeded++;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.log(` failed — ${message}`);
			failed++;
		}
	}

	console.log(`\nDone: ${succeeded} succeeded, ${failed} failed`);
};

main();
