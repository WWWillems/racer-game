#!/usr/bin/env node

/**
 * Google Search Console Audit Script for reelbase.io
 *
 * Collects search analytics, URL inspection data, and sitemap status,
 * then generates a comprehensive Markdown audit report.
 *
 * Usage:
 *   node gsc-audit.mjs [options]
 *
 * Options:
 *   --key <path>     Path to service account JSON key (default: ~/.config/gsc/ai-ugc-creator-5b092ab146e1.json)
 *   --site <url>     GSC property URL (default: sc-domain:reelbase.io)
 *   --days <number>  Number of days to look back (default: 28)
 *   --output <path>  Output file path (default: seo-audit-reports/gsc-audit-report-YYYY-MM-DD.md)
 *   --top-n <number> Number of top queries/pages to include (default: 50)
 *   --help           Show this help message
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { google } from "googleapis";

// ── CLI argument parsing ──────────────────────────────────────────────

const { values: args } = parseArgs({
	options: {
		key: {
			type: "string",
			default: join(homedir(), ".config/gsc/ai-ugc-creator-5b092ab146e1.json"),
		},
		site: { type: "string", default: "sc-domain:reelbase.io" },
		days: { type: "string", default: "28" },
		output: { type: "string" },
		"top-n": { type: "string", default: "50" },
		help: { type: "boolean", default: false },
	},
});

if (args.help) {
	console.log(`
Google Search Console Audit Script

Usage: node gsc-audit.mjs [options]

Options:
  --key <path>     Path to service account JSON key
                   (default: ~/.config/gsc/ai-ugc-creator-5b092ab146e1.json)
  --site <url>     GSC property URL (default: sc-domain:reelbase.io)
  --days <number>  Number of days to look back (default: 28)
  --output <path>  Output file path (default: seo-audit-reports/gsc-audit-report-YYYY-MM-DD.md)
  --top-n <number> Number of top queries/pages to include (default: 50)
  --help           Show this help message
`);
	process.exit(0);
}

const DAYS = parseInt(args.days, 10);
const TOP_N = parseInt(args["top-n"], 10);
const SITE_URL = args.site;
const KEY_PATH = args.key;

// ── Date helpers ──────────────────────────────────────────────────────

const formatDate = (date) => date.toISOString().split("T")[0];

const today = new Date();
const endDate = new Date(today);
endDate.setDate(endDate.getDate() - 3); // GSC data has ~3 day lag
const startDate = new Date(endDate);
startDate.setDate(startDate.getDate() - DAYS);

const START = formatDate(startDate);
const END = formatDate(endDate);

const outputPath =
	args.output ||
	join("seo-audit-reports", `gsc-audit-report-${formatDate(today)}.md`);

const prevEndDate = new Date(startDate);
prevEndDate.setDate(prevEndDate.getDate() - 1);
const prevStartDate = new Date(prevEndDate);
prevStartDate.setDate(prevStartDate.getDate() - DAYS);
const PREV_START = formatDate(prevStartDate);
const PREV_END = formatDate(prevEndDate);

// ── Authentication ────────────────────────────────────────────────────

try {
	console.log(`Authenticating with key: ${KEY_PATH}`);

	const keyFileContent = JSON.parse(await readFile(KEY_PATH, "utf-8"));

	const auth = new google.auth.GoogleAuth({
		credentials: keyFileContent,
		scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
	});

	const searchconsole = google.searchconsole({ version: "v1", auth });
	const webmasters = google.webmasters({ version: "v3", auth });

	console.log(`Auditing: ${SITE_URL}`);
	console.log(`Period: ${START} to ${END} (${DAYS} days)`);
	console.log(`Previous: ${PREV_START} to ${PREV_END}`);
	console.log("");

	// ── Data collection helpers ───────────────────────────────────────────

	const querySearchAnalytics = async (
		dimensions,
		rowLimit = TOP_N,
		start = START,
		end = END,
	) => {
		const response = await webmasters.searchanalytics.query({
			siteUrl: SITE_URL,
			requestBody: {
				startDate: start,
				endDate: end,
				dimensions,
				rowLimit,
			},
		});
		return response.data.rows || [];
	};

	const inspectUrl = async (url) => {
		try {
			const response = await searchconsole.urlInspection.index.inspect({
				requestBody: {
					inspectionUrl: url,
					siteUrl: SITE_URL,
				},
			});
			return response.data.inspectionResult;
		} catch (error) {
			return { error: error.message };
		}
	};

	// ── Collect search analytics ──────────────────────────────────────────

	console.log("Fetching top queries...");
	const topQueries = await querySearchAnalytics(["query"], TOP_N);

	console.log("Fetching top pages...");
	const topPages = await querySearchAnalytics(["page"], TOP_N);

	console.log("Fetching device breakdown...");
	const deviceBreakdown = await querySearchAnalytics(["device"], 10);

	console.log("Fetching country breakdown...");
	const countryBreakdown = await querySearchAnalytics(["country"], 10);

	console.log("Fetching daily trend...");
	const dailyTrend = await querySearchAnalytics(["date"], DAYS + 5);

	console.log("Fetching previous period for comparison...");
	const prevDailyTrend = await querySearchAnalytics(
		["date"],
		DAYS + 5,
		PREV_START,
		PREV_END,
	);

	// ── Collect URL inspection data ───────────────────────────────────────

	const pagesToInspect = topPages
		.filter((page) => !page.keys[0].includes("#"))
		.slice(0, 20);
	console.log(
		`Inspecting ${pagesToInspect.length} top pages (batches of 5)...`,
	);

	const urlInspectionResults = [];
	const INSPECT_BATCH = 5;
	for (let i = 0; i < pagesToInspect.length; i += INSPECT_BATCH) {
		const batch = pagesToInspect.slice(i, i + INSPECT_BATCH);
		const batchResults = await Promise.all(
			batch.map(async (page) => {
				const url = page.keys[0];
				const result = await inspectUrl(url);
				return { url, result };
			}),
		);
		urlInspectionResults.push(...batchResults);
		console.log(
			`  Batch ${Math.floor(i / INSPECT_BATCH) + 1}: ${batch.length} URLs inspected`,
		);
	}

	// ── Collect sitemaps ──────────────────────────────────────────────────

	console.log("Fetching sitemaps...");
	let sitemaps = [];
	try {
		const response = await webmasters.sitemaps.list({ siteUrl: SITE_URL });
		sitemaps = response.data.sitemap || [];
	} catch (error) {
		console.log(`  Warning: Could not fetch sitemaps: ${error.message}`);
	}

	// ── Compute summary stats ─────────────────────────────────────────────

	const computeStats = (rows) => {
		const clicks = rows.reduce((sum, row) => sum + (row.clicks || 0), 0);
		const impressions = rows.reduce(
			(sum, row) => sum + (row.impressions || 0),
			0,
		);
		const ctr = impressions > 0 ? clicks / impressions : 0;
		const posWeight = rows.reduce(
			(sum, row) => sum + (row.position || 0) * (row.impressions || 0),
			0,
		);
		const position = impressions > 0 ? posWeight / impressions : 0;
		return { clicks, impressions, ctr, position };
	};

	const current = computeStats(dailyTrend);
	const previous = computeStats(prevDailyTrend);

	const indexedCount = urlInspectionResults.filter(
		(r) => r.result?.indexStatusResult?.verdict === "PASS",
	).length;
	const inspectedCount = urlInspectionResults.length;
	const indexIssues = urlInspectionResults.filter(
		(r) =>
			r.result?.indexStatusResult?.verdict &&
			r.result.indexStatusResult.verdict !== "PASS",
	);

	const sitemapErrors = sitemaps.reduce(
		(sum, s) => sum + (parseInt(s.errors, 10) || 0),
		0,
	);
	const sitemapWarnings = sitemaps.reduce(
		(sum, s) => sum + (parseInt(s.warnings, 10) || 0),
		0,
	);

	// ── Markdown helpers ──────────────────────────────────────────────────

	const pct = (value) => `${(value * 100).toFixed(2)}%`;
	const pos = (value) => value.toFixed(1);
	const num = (value) => value.toLocaleString("en-US");

	const mdTable = (headers, rows) => {
		const headerRow = `| ${headers.join(" | ")} |`;
		const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;
		const dataRows = rows.map((row) => `| ${row.join(" | ")} |`);
		return [headerRow, separatorRow, ...dataRows].join("\n");
	};

	const shortenUrl = (url) => {
		try {
			const u = new URL(url);
			return u.pathname + u.search + u.hash;
		} catch {
			return url;
		}
	};

	const formatChange = (curr, prev, lowerIsBetter = false) => {
		const diff = curr - prev;
		if (prev === 0 && curr === 0) return "—";
		const pctStr =
			prev !== 0 ? `${((diff / Math.abs(prev)) * 100).toFixed(0)}%` : "new";
		const good = lowerIsBetter ? diff < 0 : diff > 0;
		const sign = diff > 0 ? "+" : "";
		return `${good ? "↑" : diff === 0 ? "→" : "↓"} ${sign}${pctStr}`;
	};

	// ── Generate report ───────────────────────────────────────────────────

	console.log("\nGenerating report...");

	const lines = [];
	const add = (line = "") => lines.push(line);

	add(`# Google Search Console Audit - reelbase.io`);
	add();
	add(
		`**Date:** ${formatDate(today)} | **Period:** ${START} to ${END} (${DAYS} days)`,
	);
	add();

	// Executive Summary
	add(`## Executive Summary`);
	add();
	add(`| Metric | Value | vs. Previous ${DAYS}d |`);
	add(`| --- | --- | --- |`);
	add(
		`| Total Clicks | ${num(current.clicks)} | ${formatChange(current.clicks, previous.clicks)} |`,
	);
	add(
		`| Total Impressions | ${num(current.impressions)} | ${formatChange(current.impressions, previous.impressions)} |`,
	);
	add(
		`| Average CTR | ${pct(current.ctr)} | ${formatChange(current.ctr, previous.ctr)} |`,
	);
	add(
		`| Average Position | ${pos(current.position)} | ${formatChange(current.position, previous.position, true)} |`,
	);
	add(`| Pages Indexed (of ${inspectedCount} inspected) | ${indexedCount} | |`);
	add(`| Index Issues | ${indexIssues.length} | |`);
	add(`| Sitemap Errors | ${sitemapErrors} | |`);
	add(`| Sitemap Warnings | ${sitemapWarnings} | |`);
	add();

	// Search Performance
	add(`## Search Performance`);
	add();

	// Top Queries
	add(`### Top Queries (by clicks)`);
	add();
	if (topQueries.length > 0) {
		add(
			mdTable(
				["#", "Query", "Clicks", "Impressions", "CTR", "Avg Position"],
				topQueries.map((row, i) => [
					String(i + 1),
					row.keys[0],
					num(row.clicks),
					num(row.impressions),
					pct(row.ctr),
					pos(row.position),
				]),
			),
		);
	} else {
		add("*No query data available for this period.*");
	}
	add();

	// Top Pages
	add(`### Top Pages (by clicks)`);
	add();
	if (topPages.length > 0) {
		add(
			mdTable(
				["#", "Page", "Clicks", "Impressions", "CTR", "Avg Position"],
				topPages.map((row, i) => [
					String(i + 1),
					shortenUrl(row.keys[0]),
					num(row.clicks),
					num(row.impressions),
					pct(row.ctr),
					pos(row.position),
				]),
			),
		);
	} else {
		add("*No page data available for this period.*");
	}
	add();

	// Device Breakdown
	add(`### Device Breakdown`);
	add();
	if (deviceBreakdown.length > 0) {
		add(
			mdTable(
				["Device", "Clicks", "Impressions", "CTR", "Avg Position"],
				deviceBreakdown.map((row) => [
					row.keys[0],
					num(row.clicks),
					num(row.impressions),
					pct(row.ctr),
					pos(row.position),
				]),
			),
		);
	} else {
		add("*No device data available for this period.*");
	}
	add();

	// Country Breakdown
	add(`### Country Breakdown`);
	add();
	if (countryBreakdown.length > 0) {
		add(
			mdTable(
				["Country", "Clicks", "Impressions", "CTR", "Avg Position"],
				countryBreakdown.map((row) => [
					row.keys[0],
					num(row.clicks),
					num(row.impressions),
					pct(row.ctr),
					pos(row.position),
				]),
			),
		);
	} else {
		add("*No country data available for this period.*");
	}
	add();

	// Daily Trend
	add(`### Daily Trend`);
	add();
	if (dailyTrend.length > 0) {
		const sorted = [...dailyTrend].sort((a, b) =>
			a.keys[0].localeCompare(b.keys[0]),
		);
		add(
			mdTable(
				["Date", "Clicks", "Impressions", "CTR", "Avg Position"],
				sorted.map((row) => [
					row.keys[0],
					num(row.clicks),
					num(row.impressions),
					pct(row.ctr),
					pos(row.position),
				]),
			),
		);
	} else {
		add("*No daily trend data available for this period.*");
	}
	add();

	// Index Coverage
	add(`## Index Coverage`);
	add();
	add(
		`**Summary:** ${indexedCount} of ${inspectedCount} inspected pages are indexed.`,
	);
	if (indexIssues.length > 0) {
		add(`**${indexIssues.length} issue(s) found.**`);
	}
	add();

	add(`### URL Inspection Results`);
	add();
	if (urlInspectionResults.length > 0) {
		add(
			mdTable(
				["URL", "Verdict", "Coverage State", "Last Crawl", "Robots"],
				urlInspectionResults.map((entry) => {
					const idx = entry.result?.indexStatusResult || {};
					const verdict = idx.verdict || "N/A";
					const coverageState = idx.coverageState || "N/A";
					const lastCrawl = idx.lastCrawlTime
						? new Date(idx.lastCrawlTime).toISOString().split("T")[0]
						: "N/A";
					const robots = idx.robotsTxtState || "N/A";
					return [
						shortenUrl(entry.url),
						verdict,
						coverageState,
						lastCrawl,
						robots,
					];
				}),
			),
		);
	} else {
		add("*No URL inspection data available.*");
	}
	add();

	// Sitemaps
	add(`## Sitemaps`);
	add();
	if (sitemaps.length > 0) {
		add(
			mdTable(
				[
					"Sitemap",
					"Type",
					"Submitted",
					"Indexed",
					"Errors",
					"Warnings",
					"Last Downloaded",
				],
				sitemaps.map((s) => {
					const submitted =
						s.contents?.reduce(
							(sum, c) => sum + (parseInt(c.submitted, 10) || 0),
							0,
						) || 0;
					const indexed =
						s.contents?.reduce(
							(sum, c) => sum + (parseInt(c.indexed, 10) || 0),
							0,
						) || 0;
					const lastDownloaded = s.lastDownloaded
						? new Date(s.lastDownloaded).toISOString().split("T")[0]
						: "N/A";
					return [
						shortenUrl(s.path),
						s.type || "N/A",
						num(submitted),
						num(indexed),
						String(s.errors || 0),
						String(s.warnings || 0),
						lastDownloaded,
					];
				}),
			),
		);
	} else {
		add("*No sitemaps found.*");
	}
	add();

	// Next Steps - prioritized by least effort, most impact
	add(`## Next Steps (prioritized by effort vs. impact)`);
	add();
	add(
		`Actions are scored and sorted so the easiest wins with the biggest payoff come first.`,
	);
	add();

	// Each action gets: { action, page?, effort (1-5, 1=easiest), impact (estimated extra clicks/month), detail }
	const actions = [];

	// ── 1. Title/meta rewrites for low-CTR, high-impression pages (very low effort, high impact)
	topPages
		.filter((row) => row.impressions > 100 && row.ctr < 0.03)
		.forEach((row) => {
			// Estimate: if CTR improved to avg of 3%, how many extra clicks?
			const currentClicks = row.clicks;
			const potentialClicks = Math.round(row.impressions * 0.03);
			const extraClicks = Math.max(0, potentialClicks - currentClicks);
			if (extraClicks > 0) {
				actions.push({
					action: "Rewrite title & meta description",
					page: shortenUrl(row.keys[0]),
					effort: 1,
					impact: extraClicks,
					detail: `CTR is ${pct(row.ctr)} with ${num(row.impressions)} impressions. A 3% CTR would add ~${num(extraClicks)} clicks/${DAYS}d.`,
				});
			}
		});

	// ── 2. Fix non-indexed pages (low effort if it's a config issue, high impact if page has value)
	indexIssues.forEach((entry) => {
		const coverageState =
			entry.result?.indexStatusResult?.coverageState || "Unknown";
		// Find the page in topPages to estimate its value
		const pageData = topPages.find((p) => p.keys[0] === entry.url);
		const impressions = pageData?.impressions || 0;
		actions.push({
			action: `Fix index issue: ${coverageState}`,
			page: shortenUrl(entry.url),
			effort: 2,
			impact: Math.max(impressions, 10), // at minimum worth investigating
			detail: `Page is not indexed (${coverageState}). Check robots.txt, canonical tags, and noindex directives.`,
		});
	});

	// ── 3. Pages ranking positions 5-10 ("striking distance" to top 5 - moderate effort, high impact)
	topPages
		.filter(
			(row) => row.position >= 5 && row.position <= 10 && row.impressions > 30,
		)
		.forEach((row) => {
			// Moving from pos 8 to pos 3 can 2-3x CTR
			const extraClicks = Math.round(row.impressions * 0.04); // conservative estimate
			actions.push({
				action: "Boost to top 5 (striking distance)",
				page: shortenUrl(row.keys[0]),
				effort: 2,
				impact: extraClicks,
				detail: `Ranks at position ${pos(row.position)} with ${num(row.impressions)} impressions. Add internal links, improve content depth, or update freshness.`,
			});
		});

	// ── 4. Pages ranking 11-20 (page 2) with decent impressions - more effort needed
	topPages
		.filter(
			(row) => row.position > 10 && row.position <= 20 && row.impressions > 50,
		)
		.forEach((row) => {
			const extraClicks = Math.round(row.impressions * 0.03);
			actions.push({
				action: "Move from page 2 to page 1",
				page: shortenUrl(row.keys[0]),
				effort: 3,
				impact: extraClicks,
				detail: `Ranks at position ${pos(row.position)} with ${num(row.impressions)} impressions. Needs content expansion, backlinks, or better internal linking.`,
			});
		});

	// ── 5. Sitemap issues (very low effort, moderate impact)
	if (sitemapErrors > 0 || sitemapWarnings > 0) {
		actions.push({
			action: "Resolve sitemap errors/warnings",
			page: "-",
			effort: 1,
			impact: Math.max(sitemapErrors * 20, 10),
			detail: `${sitemapErrors} error(s) and ${sitemapWarnings} warning(s). Fix in Google Search Console to ensure all pages are discoverable.`,
		});
	}

	// ── 6. High-impression queries where we rank but have no dedicated page (content gap)
	// Identify queries with high impressions but low clicks that don't match any top page path
	const topQueryHighImp = topQueries
		.filter((row) => row.impressions > 200 && row.ctr < 0.02)
		.slice(0, 5);
	topQueryHighImp.forEach((row) => {
		const extraClicks = Math.round(row.impressions * 0.05);
		actions.push({
			action: "Create or optimize content for query",
			page: `Query: "${row.keys[0]}"`,
			effort: 4,
			impact: extraClicks,
			detail: `${num(row.impressions)} impressions but only ${pct(row.ctr)} CTR. May need a dedicated landing page or better-targeted existing page.`,
		});
	});

	// Sort by impact/effort ratio (highest first), then by effort (lowest first)
	actions.sort((a, b) => {
		const ratioA = a.impact / a.effort;
		const ratioB = b.impact / b.effort;
		if (ratioB !== ratioA) return ratioB - ratioA;
		return a.effort - b.effort;
	});

	const effortLabels = [
		"",
		"~10 min",
		"~30 min",
		"~1-2 hours",
		"~half day",
		"~1+ day",
	];

	if (actions.length === 0) {
		add("No critical issues found. Site appears healthy.");
	} else {
		// Summary table
		add(
			mdTable(
				["#", "Action", "Page", "Effort", "Est. Impact", "Impact/Effort"],
				actions
					.slice(0, 20)
					.map((a, i) => [
						String(i + 1),
						a.action,
						a.page,
						effortLabels[a.effort],
						`+${num(a.impact)} clicks/${DAYS}d`,
						pos(a.impact / a.effort),
					]),
			),
		);
		add();

		// Detailed breakdown
		add(`### Detailed Breakdown`);
		add();
		actions.slice(0, 20).forEach((a, i) => {
			add(`**${i + 1}. ${a.action}** - ${a.page}`);
			add(
				`> Effort: ${effortLabels[a.effort]} | Potential: +${num(a.impact)} clicks/${DAYS}d`,
			);
			add(`> ${a.detail}`);
			add();
		});
	}

	add();
	add("---");
	add(`*Report generated on ${formatDate(today)} by gsc-audit.mjs*`);

	// ── Write output ──────────────────────────────────────────────────────

	const report = lines.join("\n");
	const resolvedOutput = resolve(outputPath);
	await mkdir(dirname(resolvedOutput), { recursive: true });
	await writeFile(resolvedOutput, report, "utf-8");

	console.log(`\nReport written to: ${resolvedOutput}`);
	console.log(`Total lines: ${lines.length}`);
} catch (error) {
	const msg = error.message || String(error);
	if (error.code === 403 || error.status === 403) {
		if (msg.includes("has not been used") || msg.includes("is disabled")) {
			console.error(
				"\n✗ Google Search Console API is not enabled for this project.",
			);
			console.error(
				"  Enable it at: https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview",
			);
		} else if (msg.includes("sufficient permission")) {
			console.error("\n✗ Service account lacks permission for this property.");
			console.error(
				"  Add the service account email in Search Console → Settings → Users and permissions.",
			);
			console.error(
				"  To find the email: node -e \"console.log(require('" +
					KEY_PATH +
					"').client_email)\"",
			);
		} else {
			console.error(`\n✗ Access denied: ${msg}`);
		}
	} else if (error.code === "ENOENT") {
		console.error(`\n✗ Key file not found: ${KEY_PATH}`);
		console.error(
			"  See .cursor/skills/gsc-audit/references/setup-guide.md for setup instructions.",
		);
	} else {
		console.error(`\n✗ Error: ${msg}`);
	}
	process.exit(1);
}

// ── Compute summary stats ─────────────────────────────────────────────

const totalClicks = dailyTrend.reduce((sum, row) => sum + (row.clicks || 0), 0);
const totalImpressions = dailyTrend.reduce(
	(sum, row) => sum + (row.impressions || 0),
	0,
);
const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
const avgPosition =
	dailyTrend.length > 0
		? dailyTrend.reduce((sum, row) => sum + (row.position || 0), 0) /
			dailyTrend.length
		: 0;

const indexedCount = urlInspectionResults.filter(
	(r) => r.result?.indexStatusResult?.verdict === "PASS",
).length;
const inspectedCount = urlInspectionResults.length;
const indexIssues = urlInspectionResults.filter(
	(r) =>
		r.result?.indexStatusResult?.verdict &&
		r.result.indexStatusResult.verdict !== "PASS",
);

const sitemapErrors = sitemaps.reduce((sum, s) => sum + (s.errors || 0), 0);
const sitemapWarnings = sitemaps.reduce((sum, s) => sum + (s.warnings || 0), 0);

// ── Markdown helpers ──────────────────────────────────────────────────

const pct = (value) => `${(value * 100).toFixed(2)}%`;
const pos = (value) => value.toFixed(1);
const num = (value) => value.toLocaleString("en-US");

const mdTable = (headers, rows) => {
	const headerRow = `| ${headers.join(" | ")} |`;
	const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;
	const dataRows = rows.map((row) => `| ${row.join(" | ")} |`);
	return [headerRow, separatorRow, ...dataRows].join("\n");
};

const shortenUrl = (url) => {
	try {
		const u = new URL(url);
		return u.pathname + u.search;
	} catch {
		return url;
	}
};

// ── Generate report ───────────────────────────────────────────────────

console.log("\nGenerating report...");

const lines = [];
const add = (line = "") => lines.push(line);

add(`# Google Search Console Audit - reelbase.io`);
add();
add(
	`**Date:** ${formatDate(today)} | **Period:** ${START} to ${END} (${DAYS} days)`,
);
add();

// Executive Summary
add(`## Executive Summary`);
add();
add(`| Metric | Value |`);
add(`| --- | --- |`);
add(`| Total Clicks | ${num(totalClicks)} |`);
add(`| Total Impressions | ${num(totalImpressions)} |`);
add(`| Average CTR | ${pct(avgCtr)} |`);
add(`| Average Position | ${pos(avgPosition)} |`);
add(`| Pages Indexed (of ${inspectedCount} inspected) | ${indexedCount} |`);
add(`| Index Issues | ${indexIssues.length} |`);
add(`| Sitemap Errors | ${sitemapErrors} |`);
add(`| Sitemap Warnings | ${sitemapWarnings} |`);
add();

// Search Performance
add(`## Search Performance`);
add();

// Top Queries
add(`### Top Queries (by clicks)`);
add();
if (topQueries.length > 0) {
	add(
		mdTable(
			["#", "Query", "Clicks", "Impressions", "CTR", "Avg Position"],
			topQueries.map((row, i) => [
				String(i + 1),
				row.keys[0],
				num(row.clicks),
				num(row.impressions),
				pct(row.ctr),
				pos(row.position),
			]),
		),
	);
} else {
	add("*No query data available for this period.*");
}
add();

// Top Pages
add(`### Top Pages (by clicks)`);
add();
if (topPages.length > 0) {
	add(
		mdTable(
			["#", "Page", "Clicks", "Impressions", "CTR", "Avg Position"],
			topPages.map((row, i) => [
				String(i + 1),
				shortenUrl(row.keys[0]),
				num(row.clicks),
				num(row.impressions),
				pct(row.ctr),
				pos(row.position),
			]),
		),
	);
} else {
	add("*No page data available for this period.*");
}
add();

// Device Breakdown
add(`### Device Breakdown`);
add();
if (deviceBreakdown.length > 0) {
	add(
		mdTable(
			["Device", "Clicks", "Impressions", "CTR", "Avg Position"],
			deviceBreakdown.map((row) => [
				row.keys[0],
				num(row.clicks),
				num(row.impressions),
				pct(row.ctr),
				pos(row.position),
			]),
		),
	);
} else {
	add("*No device data available for this period.*");
}
add();

// Country Breakdown
add(`### Country Breakdown`);
add();
if (countryBreakdown.length > 0) {
	add(
		mdTable(
			["Country", "Clicks", "Impressions", "CTR", "Avg Position"],
			countryBreakdown.map((row) => [
				row.keys[0],
				num(row.clicks),
				num(row.impressions),
				pct(row.ctr),
				pos(row.position),
			]),
		),
	);
} else {
	add("*No country data available for this period.*");
}
add();

// Daily Trend
add(`### Daily Trend`);
add();
if (dailyTrend.length > 0) {
	const sorted = [...dailyTrend].sort((a, b) =>
		a.keys[0].localeCompare(b.keys[0]),
	);
	add(
		mdTable(
			["Date", "Clicks", "Impressions", "CTR", "Avg Position"],
			sorted.map((row) => [
				row.keys[0],
				num(row.clicks),
				num(row.impressions),
				pct(row.ctr),
				pos(row.position),
			]),
		),
	);
} else {
	add("*No daily trend data available for this period.*");
}
add();

// Index Coverage
add(`## Index Coverage`);
add();
add(
	`**Summary:** ${indexedCount} of ${inspectedCount} inspected pages are indexed.`,
);
if (indexIssues.length > 0) {
	add(`**${indexIssues.length} issue(s) found.**`);
}
add();

add(`### URL Inspection Results`);
add();
if (urlInspectionResults.length > 0) {
	add(
		mdTable(
			["URL", "Verdict", "Coverage State", "Last Crawl", "Robots"],
			urlInspectionResults.map((entry) => {
				const idx = entry.result?.indexStatusResult || {};
				const verdict = idx.verdict || "N/A";
				const coverageState = idx.coverageState || "N/A";
				const lastCrawl = idx.lastCrawlTime
					? new Date(idx.lastCrawlTime).toISOString().split("T")[0]
					: "N/A";
				const robots = idx.robotsTxtState || "N/A";
				return [
					shortenUrl(entry.url),
					verdict,
					coverageState,
					lastCrawl,
					robots,
				];
			}),
		),
	);
} else {
	add("*No URL inspection data available.*");
}
add();

// Sitemaps
add(`## Sitemaps`);
add();
if (sitemaps.length > 0) {
	add(
		mdTable(
			[
				"Sitemap",
				"Type",
				"Submitted",
				"Indexed",
				"Errors",
				"Warnings",
				"Last Downloaded",
			],
			sitemaps.map((s) => {
				const submitted =
					s.contents?.reduce(
						(sum, c) => sum + (parseInt(c.submitted, 10) || 0),
						0,
					) || 0;
				const indexed =
					s.contents?.reduce(
						(sum, c) => sum + (parseInt(c.indexed, 10) || 0),
						0,
					) || 0;
				const lastDownloaded = s.lastDownloaded
					? new Date(s.lastDownloaded).toISOString().split("T")[0]
					: "N/A";
				return [
					shortenUrl(s.path),
					s.type || "N/A",
					num(submitted),
					num(indexed),
					String(s.errors || 0),
					String(s.warnings || 0),
					lastDownloaded,
				];
			}),
		),
	);
} else {
	add("*No sitemaps found.*");
}
add();

// Next Steps - prioritized by least effort, most impact
add(`## Next Steps (prioritized by effort vs. impact)`);
add();
add(
	`Actions are scored and sorted so the easiest wins with the biggest payoff come first.`,
);
add();

// Each action gets: { action, page?, effort (1-5, 1=easiest), impact (estimated extra clicks/month), detail }
const actions = [];

// ── 1. Title/meta rewrites for low-CTR, high-impression pages (very low effort, high impact)
topPages
	.filter((row) => row.impressions > 100 && row.ctr < 0.03)
	.forEach((row) => {
		// Estimate: if CTR improved to avg of 3%, how many extra clicks?
		const currentClicks = row.clicks;
		const potentialClicks = Math.round(row.impressions * 0.03);
		const extraClicks = Math.max(0, potentialClicks - currentClicks);
		if (extraClicks > 0) {
			actions.push({
				action: "Rewrite title & meta description",
				page: shortenUrl(row.keys[0]),
				effort: 1,
				impact: extraClicks,
				detail: `CTR is ${pct(row.ctr)} with ${num(row.impressions)} impressions. A 3% CTR would add ~${num(extraClicks)} clicks/${DAYS}d.`,
			});
		}
	});

// ── 2. Fix non-indexed pages (low effort if it's a config issue, high impact if page has value)
indexIssues.forEach((entry) => {
	const coverageState =
		entry.result?.indexStatusResult?.coverageState || "Unknown";
	// Find the page in topPages to estimate its value
	const pageData = topPages.find((p) => p.keys[0] === entry.url);
	const impressions = pageData?.impressions || 0;
	actions.push({
		action: `Fix index issue: ${coverageState}`,
		page: shortenUrl(entry.url),
		effort: 2,
		impact: Math.max(impressions, 10), // at minimum worth investigating
		detail: `Page is not indexed (${coverageState}). Check robots.txt, canonical tags, and noindex directives.`,
	});
});

// ── 3. Pages ranking positions 5-10 ("striking distance" to top 5 - moderate effort, high impact)
topPages
	.filter(
		(row) => row.position >= 5 && row.position <= 10 && row.impressions > 30,
	)
	.forEach((row) => {
		// Moving from pos 8 to pos 3 can 2-3x CTR
		const extraClicks = Math.round(row.impressions * 0.04); // conservative estimate
		actions.push({
			action: "Boost to top 5 (striking distance)",
			page: shortenUrl(row.keys[0]),
			effort: 2,
			impact: extraClicks,
			detail: `Ranks at position ${pos(row.position)} with ${num(row.impressions)} impressions. Add internal links, improve content depth, or update freshness.`,
		});
	});

// ── 4. Pages ranking 11-20 (page 2) with decent impressions - more effort needed
topPages
	.filter(
		(row) => row.position > 10 && row.position <= 20 && row.impressions > 50,
	)
	.forEach((row) => {
		const extraClicks = Math.round(row.impressions * 0.03);
		actions.push({
			action: "Move from page 2 to page 1",
			page: shortenUrl(row.keys[0]),
			effort: 3,
			impact: extraClicks,
			detail: `Ranks at position ${pos(row.position)} with ${num(row.impressions)} impressions. Needs content expansion, backlinks, or better internal linking.`,
		});
	});

// ── 5. Sitemap issues (very low effort, moderate impact)
if (sitemapErrors > 0 || sitemapWarnings > 0) {
	actions.push({
		action: "Resolve sitemap errors/warnings",
		page: "-",
		effort: 1,
		impact: Math.max(sitemapErrors * 20, 10),
		detail: `${sitemapErrors} error(s) and ${sitemapWarnings} warning(s). Fix in Google Search Console to ensure all pages are discoverable.`,
	});
}

// ── 6. High-impression queries where we rank but have no dedicated page (content gap)
// Identify queries with high impressions but low clicks that don't match any top page path
const topQueryHighImp = topQueries
	.filter((row) => row.impressions > 200 && row.ctr < 0.02)
	.slice(0, 5);
topQueryHighImp.forEach((row) => {
	const extraClicks = Math.round(row.impressions * 0.05);
	actions.push({
		action: "Create or optimize content for query",
		page: `Query: "${row.keys[0]}"`,
		effort: 4,
		impact: extraClicks,
		detail: `${num(row.impressions)} impressions but only ${pct(row.ctr)} CTR. May need a dedicated landing page or better-targeted existing page.`,
	});
});

// Sort by impact/effort ratio (highest first), then by effort (lowest first)
actions.sort((a, b) => {
	const ratioA = a.impact / a.effort;
	const ratioB = b.impact / b.effort;
	if (ratioB !== ratioA) return ratioB - ratioA;
	return a.effort - b.effort;
});

const effortLabels = [
	"",
	"~10 min",
	"~30 min",
	"~1-2 hours",
	"~half day",
	"~1+ day",
];

if (actions.length === 0) {
	add("No critical issues found. Site appears healthy.");
} else {
	// Summary table
	add(
		mdTable(
			["#", "Action", "Page", "Effort", "Est. Impact", "Impact/Effort"],
			actions
				.slice(0, 20)
				.map((a, i) => [
					String(i + 1),
					a.action,
					a.page,
					effortLabels[a.effort],
					`+${num(a.impact)} clicks/${DAYS}d`,
					pos(a.impact / a.effort),
				]),
		),
	);
	add();

	// Detailed breakdown
	add(`### Detailed Breakdown`);
	add();
	actions.slice(0, 20).forEach((a, i) => {
		add(`**${i + 1}. ${a.action}** - ${a.page}`);
		add(
			`> Effort: ${effortLabels[a.effort]} | Potential: +${num(a.impact)} clicks/${DAYS}d`,
		);
		add(`> ${a.detail}`);
		add();
	});
}

add();
add("---");
add(`*Report generated on ${formatDate(today)} by gsc-audit.mjs*`);

// ── Write output ──────────────────────────────────────────────────────

const report = lines.join("\n");
const resolvedOutput = resolve(outputPath);
await mkdir(dirname(resolvedOutput), { recursive: true });
await writeFile(resolvedOutput, report, "utf-8");

console.log(`\nReport written to: ${resolvedOutput}`);
console.log(`Total lines: ${lines.length}`);
