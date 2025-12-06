# Go High Level Configuration Exporter

A Node.js utility that exports a **non-PII, configuration-only** blueprint of a Go High Level (LeadConnector) Location via OAuth 2.0 / Private Integration tokens. Ideal for audits, migrations, documentation, and feeding structured exports into AI tools without leaking customer data.

## 📚 Table of Contents
- ⭐️ Features
- 🔐 Auth Models
- ⚙️ Requirements
- 🔑 Getting Credentials
- 📥 Installation
- ▶️ Running the Exporter
- 🧪 Preflight & Output
- 📂 Output Structure
- 🔒 Security Notes
- 🚫 Exclusions
- 🧩 Use Cases
- 🤖 Using AI to Analyze & Optimize
- 📖 Reference Files

## ⭐️ Features
- Fetches every non-PII configuration endpoint scoped to one Location (funnels, forms, workflows, calendars, automations, products, AI settings, and more).
- Authenticates with an internal OAuth app or Private Integration token and transparently refreshes access tokens.
- Handles pagination, retries 429 responses with exponential backoff, and logs each resource round.
- Validates the Location before exporting and summarizes success/failure counts at the end.
- Produces one JSON file per resource inside a timestamped `exports/YYYY-MM-DD_HHmmss/` folder so the data can be version-controlled or dropped into AI.

## 🔐 Auth Models
Choose one of two authentication modes:

1. **OAuth App (Sub-Account / Location)**
   - Requires `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, and `OAUTH_REFRESH_TOKEN` scoped to the target Location.
   - The exporter exchanges the refresh token for a short-lived access token and auto-refreshes it if it expires.
2. **Private Integration Token**
   - Supply `PRIVATE_INTEGRATION_TOKEN` from a Private Integration installed into the Location.
   - This token is a static OAuth token that works across the same v2 endpoints.

Either mode must also be paired with `LOCATION_ID` (the target Location / Sub-Account). See [SCOPES.md](./SCOPES.md) for the minimal scopes that enable all config exports.

## ⚙️ Requirements
- Node.js 18+ on your machine
- `npm install` to populate dependencies (`axios`, `dayjs`, `fs-extra`, `dotenv`)
- Location-scoped credentials:
  - OAuth app (Client ID / Secret / Refresh Token), or
  - Private Integration token
- `LOCATION_ID` for the target sub-account
- Optional `.env` file (see `.env.example`) to keep creds out of your shell history

## 🔑 Getting Credentials
### OAuth App (Sub-Account)
1. In HighLevel, create a private OAuth app with Target User = Sub-Account and install it into the fundHub Location.
2. Exchange the auth code for `access_token` + `refresh_token` via `https://services.leadconnectorhq.com/oauth/token` and record the returned `refresh_token`.
3. Populate `.env` (or your shell) with `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_REFRESH_TOKEN`, and `LOCATION_ID`.

### Private Integration Token (Agency↔Location)
1. Create a Private Integration in Agency Settings and install it into the Location.
2. Copy the token and store it in `.env` as `PRIVATE_INTEGRATION_TOKEN` along with `LOCATION_ID`.
3. No client ID/secret/refresh token required.

The exporter automatically detects which mode you’re using and refuses to run if your environment is missing the required variables.

## 📥 Installation
```bash
npm install
```
Add `.env` to `.gitignore` (already configured) and copy `.env.example` to `.env` so your secrets stay local.

## ▶️ Running the Exporter
Once your `.env` is populated, run:
```bash
npm run export
```
This reads `.env` (via `dotenv`) so you can keep credentials out of your terminal history. The script will:
1. Validate the credentials by hitting `/locations/{LOCATION_ID}`.
2. Authenticate via OAuth/Private Integration and cache the access token.
3. Iterate through every configuration resource, handle pagination, and write each resource to JSON.
4. Summarize successes and failures before exiting.

If you prefer inline env vars:
```bash
OAUTH_CLIENT_ID=... OAUTH_CLIENT_SECRET=... OAUTH_REFRESH_TOKEN=... LOCATION_ID=XYZ npm run export
```
or
```bash
PRIVATE_INTEGRATION_TOKEN=... LOCATION_ID=XYZ npm run export
```

## 🧪 Preflight & Output
The exporter runs a preflight location fetch before issuing other calls. If the credentials are invalid, it exits immediately with a clear error. Otherwise each resource is saved inside `/exports/YYYY-MM-DD_HHmmss/` so you can drop the entire folder into AI tools for analysis.

## 📂 Output Structure
Each run produces a folder named by timestamp with one file per resource:
- `location-settings.json`
- `workflows.json`
- `funnels.json`
- `funnel-pages.json`
- `funnels-pagecount.json`
- `funnels-redirects.json`
- `forms.json`
- `surveys.json`
- `calendars.json`
- `calendar-events.json`
- `calendar-groups.json`
- `calendar-resources.json`
- `custom-values.json`
- `custom-fields.json`
- `tags.json`
- `templates.json`
- `medias.json`
- `emails.json`
- `kb.json`
- `conversation-ai.json`
- `agent-studio.json`
- `pipelines.json`
- `pipeline-stages.json`
- `products.json`
- `prices.json`
- `collections.json`
- `orders.json`
- `transactions.json`
- `subscriptions.json`
- `coupons.json`
- `links.json`

Each JSON file contains the raw API response (arrays or objects). Funnel and page files also include the detail responses from `/funnels/funnel/{id}` and `/funnels/page/{pageId}` so you have the full configuration.

## 🔒 Security Notes
- Never commit `.env` or tokens. Already ignored by `.gitignore`.
- This exporter intentionally avoids any endpoints that return contact data, conversation bodies, or person-level payment info.
- Tokens are scoped to a single Location and exported data is safe for audits, documentation, and AI ingestion.
- The `SCOPES.md` file lists the minimal OAuth scopes required for the exporter to gather everything safely.

## 🚫 Exclusions
We do not pull any of the following:
- Contacts or contact lists
- Conversation transcripts, voicemail, or SMS history
- Phone numbers, emails, or personal addresses
- Task notes, opportunities tied to customers, or payment data tied to individuals

## 🧩 Use Cases
- System configuration audits or system-of-record documentation
- Migration or environment cloning prep
- Feeding into AI agents for diagrams, SOPs, or troubleshooting
- Tracking changes to automations, tags, or pipelines over time

## 🤖 Using AI to Analyze & Optimize
Drop the entire export folder into ChatGPT, Claude, or another assistant and ask:
- “Show me the workflow dependencies in this system.”
- “Generate an automation map of this Location.”
- “Highlight unused tags, pipelines, or email templates.”
- “Create SOPs for each funnel/workflow pair.”

The JSON files are structured for machine consumption, making it easy for AI to reason about automations, calendars, emails, products, knowledge bases, and agent configurations without exposing customer data.

## 📖 Reference Files
- **`export-ghl.js`** – orchestrates auth, pagination, retries, and per-resource exports.
- **`How To Use.md`** – non-technical SOP for installing Node, obtaining credentials, and running the exporter.
- **`.env.example`** – sample environment file showing all required variables.
- **`SCOPES.md`** – lists the OAuth scopes the exporter requires so admins can scope tokens appropriately.

