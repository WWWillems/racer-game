# Google Search Console API - Setup Guide

## Existing Credentials

Service account key: `~/.config/gsc/ai-ugc-creator-5b092ab146e1.json`

## Verify Access

1. Open [Google Search Console](https://search.google.com/search-console)
2. Go to **Settings > Users and permissions** for the `sc-domain:reelbase.io` property
3. Confirm the service account email (from the JSON key file) is listed as a user

To check the service account email:

```bash
node -e "const k = require(require('os').homedir() + '/.config/gsc/ai-ugc-creator-5b092ab146e1.json'); console.log(k.client_email)"
```

## Rotate Credentials

If the key needs to be rotated:

1. Go to [Google Cloud Console > IAM > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Select the service account
3. Go to **Keys > Add Key > Create new key > JSON**
4. Save the new key to `~/.config/gsc/` and update the `--key` argument when running the audit script

## Install Dependencies

Only install dependencies if the local `node_modules` folder is missing:

```bash
cd .cursor/skills/gsc-audit/scripts
[ -d node_modules ] || npm install
```

Requires Node.js 18+ (project uses v22.22.0 via `.nvmrc`).
