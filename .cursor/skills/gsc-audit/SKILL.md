---
name: gsc-audit
description: Audit Google Search Console for reelbase.io and generate a Markdown report with search analytics, URL inspection, and sitemaps status. Use when the user asks to audit GSC, check SEO performance, generate an SEO report, review search console data, check index coverage, or analyze search traffic for reelbase.io.
---

# Google Search Console Audit

Generate a comprehensive SEO audit report for reelbase.io using the Google Search Console API.

## Prerequisites

1. Service account credentials at `~/.config/gsc/ai-ugc-creator-5b092ab146e1.json`
2. Dependencies installed: if `.cursor/skills/gsc-audit/scripts/node_modules` does not exist, run `npm install` in `.cursor/skills/gsc-audit/scripts/`; otherwise skip reinstalling
3. For setup or credential rotation details, see [setup-guide.md](references/setup-guide.md)

## Running the Audit

```bash
node .cursor/skills/gsc-audit/scripts/gsc-audit.mjs
```

This uses sensible defaults (last 28 days, top 50 results, `sc-domain:reelbase.io`). The report is written to `seo-audit-reports/gsc-audit-report-YYYY-MM-DD.md` (the directory is created automatically if it doesn't exist).

### Options

| Flag | Default | Description |
| --- | --- | --- |
| `--key <path>` | `~/.config/gsc/ai-ugc-creator-5b092ab146e1.json` | Service account JSON key |
| `--site <url>` | `sc-domain:reelbase.io` | GSC property URL |
| `--days <n>` | `28` | Lookback period in days |
| `--output <path>` | `seo-audit-reports/gsc-audit-report-YYYY-MM-DD.md` | Output file path |
| `--top-n <n>` | `50` | Number of top queries/pages |
| `--help` | | Show help message |

### Example with custom options

```bash
node .cursor/skills/gsc-audit/scripts/gsc-audit.mjs --days 90 --top-n 100 --output docs/seo-report.md
```

## Agent Execution Notes

When running the audit script from Cursor, use `required_permissions: ["full_network"]` since the script calls the Google Search Console API.

The script includes built-in error handling with actionable messages for common failures (API not enabled, missing permissions, missing key file). If the script exits with an error, read the output for specific resolution steps.

## Report Sections

The generated report contains:

1. **Executive Summary** - Total clicks, impressions, average CTR, average position, index health, sitemap status, **with period-over-period deltas**
2. **Top Queries** - Highest-traffic search queries with clicks, impressions, CTR, position
3. **Top Pages** - Best-performing pages by clicks
4. **Device Breakdown** - Performance split by mobile, desktop, tablet
5. **Country Breakdown** - Top countries by clicks
6. **Daily Trend** - Day-by-day clicks and impressions for the period
7. **Index Coverage** - URL inspection results for top pages (verdict, coverage state, last crawl, robots status)
8. **Sitemaps** - Submitted sitemaps with indexed/submitted URL counts and error/warning counts
9. **Next Steps** - Prioritized action items sorted by impact/effort ratio (least effort, most impact first)

### Period-over-Period Comparison

The executive summary automatically compares the current period against the previous period of the same length. For example, with `--days 28`, it compares the last 28 days against the 28 days before that. Deltas show directional arrows (↑/↓) with percentage change.

## Interpreting the Next Steps

Actions are scored on two dimensions and sorted so the best opportunities come first:

- **Effort** (1-5): estimated time to implement, from ~10 min (title rewrite) to ~1+ day (new content)
- **Impact**: estimated additional clicks per period if the action is taken
- **Impact/Effort ratio**: higher = better ROI. The table is sorted by this ratio descending

Action types from easiest to hardest:
1. **Rewrite title & meta description** (~10 min) - highest ROI for low-CTR, high-impression pages
2. **Resolve sitemap errors** (~10 min) - quick config fix to ensure page discovery
3. **Fix index issues** (~30 min) - check robots.txt, canonical tags, noindex directives
4. **Boost striking-distance pages** (~30 min) - add internal links, improve content for pages ranking 5-10
5. **Move page-2 pages to page 1** (~1-2 hours) - expand content, build backlinks for pages ranking 11-20
6. **Create content for high-impression queries** (~half day) - new landing page or major rewrite for queries with poor CTR

## Troubleshooting

### "Google Search Console API has not been used in project..."

The API needs to be enabled in Google Cloud Console. Visit the URL in the error message to enable it, then wait a few minutes and retry.

### "User does not have sufficient permission for site..."

The service account needs to be added as a user in Google Search Console:

1. Find the service account email: `node -e "console.log(require(require('os').homedir() + '/.config/gsc/ai-ugc-creator-5b092ab146e1.json').client_email)"`
2. Open [Google Search Console](https://search.google.com/search-console) → Settings → Users and permissions
3. Add the email with **Full** permission (needed for URL inspection)

### "Key file not found"

The service account JSON key is missing from `~/.config/gsc/`. See [setup-guide.md](references/setup-guide.md) to create or rotate credentials.
