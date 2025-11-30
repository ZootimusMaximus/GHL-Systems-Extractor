# GHL-Systems-Extractor
Exports GHL workflows, funnels, websites, forms, surveys, email templates, SMS templates, pipelines, custom fields, tags, trigger links, and calendar settings as structured JSON.
A Node.js tool for exporting non-client configuration data from a Go High Level (LeadConnector) sub-account.
This is designed for system audits, backups, version-control, and documentation, without exposing any personal data.

🚀 What This Tool Exports

This exporter pulls only system configuration assets, not contacts or customer data.

Included:

Workflows / Automations

Funnels & Funnel Steps

Websites

Forms

Surveys

Email Templates

SMS Templates

Pipelines (structure only)

Custom Fields

Tags

Trigger Links

Calendar Settings

Excluded (for safety):

❌ Contacts

❌ Conversations

❌ Opportunities

❌ Payments

❌ Notes / Tasks

❌ Any PII-related objects

📂 Output Structure

Exports are saved to:

exports/YYYY-MM-DD_HHMMSS/
  workflows.json
  funnels.json
  websites.json
  forms.json
  surveys.json
  email-templates.json
  sms-templates.json
  pipelines.json
  custom-fields.json
  tags.json
  calendars.json


Each file contains raw JSON returned from GHL’s API.

🔧 Requirements

Node.js 18+

GHL Private Integration Token or Location API Key

Location ID for the sub-account you want to audit

🔑 How to Get Your GHL Credentials
1. Location ID

Inside your GHL sub-account, the URL looks like:

https://app.gohighlevel.com/location/{LOCATION_ID}/...


Copy the string after /location/.

2. API Token

Go to:

Settings → Integrations → API Keys


Or (Agency level):

Agency Settings → Private Integrations → Create Token


DO NOT commit your token into GitHub.

📦 Install
npm install

▶️ Run the Export
TOKEN=your_token_here LOCATION_ID=your_location_id node export-ghl.js


Example:

TOKEN=abc123 LOCATION_ID=xyz789 node export-ghl.js

🛡️ Security Notes

This exporter contains zero client/PII endpoints by design.

.gitignore should include .env or any file storing credentials.

Never push your API token to GitHub.

Use read-only scoped tokens where possible.

🧩 Use Cases

System audits

Documenting your GHL infrastructure

Migrating systems

Version-controlling workflow logic

Rebuilding accounts from scratch

Debugging automation logic

Snapshotting your config without pulling client data
