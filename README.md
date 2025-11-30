A Node.js tool for exporting non-client configuration data from a Go High Level (LeadConnector) sub-account.  
Useful for audits, backups, version control, documentation, and AI optimization — all without exposing personal data.

## 📚 Table of Contents
- ⭐ Features
- 📦 Exported Data
- 🗂 Output Structure
- ⚙️ Requirements
- 🔑 Getting Credentials
- 📥 Installation
- ▶️ Running the Exporter
- 🔒 Security Notes
- 🧩 Use Cases
- 🚫 What This Exporter Cannot Pull
- 🤖 Using AI to Analyze & Optimize

## ⭐ Features
- Exports major GHL configuration assets
- Saves structured JSON for each resource
- No PII, no contacts, no conversations
- Ideal for audits, migrations, rebuilds, documentation
- Works with Private Integration Tokens or API Keys
- Updated for 2025 LeadConnector API behavior
- Includes rate-limit (429) retry handling

## 📦 Exported Data (Safe Only)
### Included
- Workflows / Automations  
- Funnels  
- Funnel Pages  
- Forms  
- Surveys  
- Email Templates  
- SMS Templates  
- Pipelines (structure only)  
- Custom Fields  
- Custom Values  
- Tags  
- Trigger Links  
- Calendar Settings  

### Excluded (PII)
- Contacts  
- Conversations  
- Opportunities  
- Payments  
- Tasks / Notes  
- Analytics tied to users  
- Any customer-facing data  

## 🗂 Output Structure
exports/YYYY-MM-DD_HHMMSS/
workflows.json
funnels.json
funnel-pages.json
forms.json
surveys.json
email-templates.builder.json
templates.all.json
templates.email.json
templates.sms.json
pipelines.json
custom-fields.json
custom-values.json
tags.json
trigger-links.json
calendars.json

markdown
Copy code

## ⚙️ Requirements
- Node.js 18+
- GHL Location ID
- Location API Key or Private Integration Token

## 🔑 Getting Credentials
### Location ID  
URL format:
https://app.gohighlevel.com/location/{LOCATION_ID}/...

shell
Copy code

### API Token  
**Location Level:** Settings → Integrations → API Keys  
**Agency Level:** Agency Settings → Private Integrations → Create Token  

> Never commit API keys or .env files.

## 📥 Installation
```bash
npm install
▶️ Running the Exporter
bash
Copy code
TOKEN=your_token LOCATION_ID=your_location_id node export-ghl.js
Example:

bash
Copy code
TOKEN=abc123 LOCATION_ID=xyz789 node export-ghl.js
🔒 Security Notes
No PII endpoints used

Add .env to .gitignore

Use minimum-scope keys

Safe to store in version control

🧩 Use Cases
System configuration audits

Mapping automation logic

Documenting GHL setup

Migrating or cloning accounts

Version-controlling workflows

Tracking structural changes

Debugging broken automation logic

Feeding config into AI for optimization

🚫 What This Exporter Cannot Pull
Email/SMS History:
Retrieve manually via Conversations → Export CSV

Funnel Analytics:
Retrieve via Funnel Analytics or GA4

Workflow Performance:
Retrieve via Workflow → History

🤖 Using AI to Analyze & Optimize
Upload the export folder into AI to automatically:

Generate system diagrams

Map funnel → workflow → field relationships

Document naming conventions

Create SOPs

Identify redundant workflows

Suggest cleaner logic paths

Find unused/duplicate fields

Propose trigger/delay optimizations

Improve tagging and pipelines

Generate migration scripts

Auto-document changes across exports

Your GHL system becomes an analyzable, optimizable blueprint — not a black box
