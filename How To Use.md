# SOP: How to Use the GHL Config Exporter (Non-Technical Guide)

This guide helps you export your Go High Level Location configuration even if you don’t write code. The exporter now uses OAuth 2.0 / LeadConnector API v2 so you stay in sync with the latest security model.

---

## 1. What This Tool Does 📦
It exports the configuration blueprint of your Go High Level account, including workflows, funnels, forms, calendars, emails, products, AI/Agent Studio settings, and more. It never exports contacts, conversations, phone numbers, or any customer data. Think of it as saving the **system architecture** details.

---

## 2. Install Node.js 🛠️
1. Visit https://nodejs.org and download the current LTS (18+).
2. Install it normally. You only need to do this once per machine.

---

## 3. Download the Exporter Repository 📁
1. On GitHub, click the green **Code** button.
2. Click **Download ZIP** and unzip it.
3. Open the folder in your terminal/finder. You should see:
   - `export-ghl.js`
   - `package.json`
   - `README.md`
   - `.env.example`
   - `SCOPES.md`

---

## 4. Open the Project Folder in a Terminal 💻
### Windows:
- Press Start → type **cmd** → Enter

### Mac/Linux:
- Press **Command + Space** → type **terminal** → Enter

Navigate to the project folder:
```bash
cd path/to/your/exporter-folder
```

Tip: Drag the folder into the terminal window to autofill the path.

---

## 5. Install Dependencies 📦
```bash
npm install
```
This sets up everything Node needs (`axios`, `dayjs`, `fs-extra`, `dotenv`).

---

## 6. Provide Credentials & Settings 🔑
Copy `.env.example` to `.env` and fill in the values. You only need one authentication method:

### Option A: OAuth App for the Location
1. A developer/agency creates a private OAuth app with Target User = Sub-Account and installs it into your Location.
2. Use the OAuth token exchange (`https://services.leadconnectorhq.com/oauth/token`) to swap your authorization code for `refresh_token`, `access_token`, etc.
3. In `.env`, set:
   - `OAUTH_CLIENT_ID`
   - `OAUTH_CLIENT_SECRET`
   - `OAUTH_REFRESH_TOKEN`
   - `LOCATION_ID`

The exporter will automatically exchange the refresh token for an access token and refresh it when it expires.

### Option B: Private Integration Token
1. Create a Private Integration token in Agency Settings and install it into the Location.
2. In `.env`, set:
   - `PRIVATE_INTEGRATION_TOKEN`
   - `LOCATION_ID`

You don’t need the client ID/secret or refresh token for this mode; the exporter will use the token directly.

See `SCOPES.md` for the permissions required by whichever token you create.

---

## 7. Run the Export ▶️
```bash
npm run export
```
The script reads `.env`, validates the Location, fetches each config endpoint with OAuth tokens, and writes everything to `exports/YYYY-MM-DD_HHmmss/`.

🗂️ Inside that folder you’ll have files like `funnels.json`, `funnel-pages.json`, `workflows.json`, `emails.json`, `kb.json`, `products.json`, `coupons.json`, etc.

---

## 8. What To Do With the Export 🧠
Share the folder with your AI assistant and ask:
- “What workflows depend on this pipeline?”
- “Summarize the funnel automation flows.”
- “Show me duplicate tags or unused templates.”
- “Document the Agent Studio + Conversation AI setup.”

You can also commit the folder to version control or store it offline for audits.

---

## 9. Troubleshooting 🧪
### "Preflight validation failed"
Your credentials are wrong or missing. Re-run `npm run export` after ensuring `.env` has the right token and `LOCATION_ID`.

### "Invalid refresh token"
Issue a new refresh token from the OAuth app (or reinstall the Private Integration) and update `.env`.

### "Exports folder ended with errors"
Check the summary at the end of the script: it lists each resource that failed along with the HTTP status.

---

## 10. Purpose of This Export 🎯
- Document automations, funnels, forms, tags, and knowledge-base content.
- Prepare for migrations, audits, or handing off to another team.
- Give AI assistants structured JSON that describe your entire location’s configuration.
- Detect drift over time by comparing exports across dates.

---

## 11. If You Don't Understand Something 🤷‍♂️
Upload the export folder into AI and ask:
- “Explain this export to me like I’m a business owner.”
- “What should I do next to audit my system?”
- “Generate SOPs for each workflow/funnel pair.”

This exporter is designed to work with AI even if you’re not technical. 🤖✨

