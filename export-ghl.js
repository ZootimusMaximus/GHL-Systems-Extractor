// export-ghl.js
//
// HighLevel (GHL) Config Exporter — No PII
// Pulls configuration assets using the 2025 HighLevel Unified API.
// Exports JSON files inside /exports/YYYY-MM-DD_HHMMSS/
//
// ENV Vars:
//   TOKEN=Your_HighLevel_API_Token
//   LOCATION_ID=Your_Location_ID
//
// Run with:
// TOKEN=xxx LOCATION_ID=yyy node export-ghl.js

const axios = require("axios");
const fs = require("fs-extra");
const dayjs = require("dayjs");

// Load credentials
const TOKEN = process.env.TOKEN;
const LOCATION_ID = process.env.LOCATION_ID;

// NEW HighLevel Unified API URL
const BASE_URL = "https://api.msgsndr.com";

// Validate env vars
if (!TOKEN || !LOCATION_ID) {
  console.error("\n❌ ERROR: Missing TOKEN or LOCATION_ID.\n");
  console.error("Example:");
  console.error('TOKEN=abc LOCATION_ID=xyz node export-ghl.js\n');
  process.exit(1);
}

// Create API client
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/json",
    "Content-Type": "application/json"
  },
  timeout: 30000
});

// ✅ FINALLY CORRECT 2025 HIGHLEVEL ENDPOINTS
const RESOURCES = [
  { name: "workflows", path: `/workflows/list?locationId=${LOCATION_ID}` },
  { name: "funnels", path: `/funnels/list?locationId=${LOCATION_ID}` },
  { name: "websites", path: `/websites/list?locationId=${LOCATION_ID}` },
  { name: "forms", path: `/forms/list?locationId=${LOCATION_ID}` },
  { name: "surveys", path: `/surveys/list?locationId=${LOCATION_ID}` },
  { name: "email-templates", path: `/email-templates/list?locationId=${LOCATION_ID}` },
  { name: "sms-templates", path: `/sms-templates/list?locationId=${LOCATION_ID}` },
  { name: "pipelines", path: `/opportunities/pipelines/list?locationId=${LOCATION_ID}` },
  { name: "custom-fields", path: `/custom-fields/list?locationId=${LOCATION_ID}` },
  { name: "tags", path: `/tags/list?locationId=${LOCATION_ID}` },
  { name: "calendars", path: `/calendars/list?locationId=${LOCATION_ID}` },
  { name: "trigger-links", path: `/links/list?locationId=${LOCATION_ID}` }
];

// Generic GET
async function fetchResource(endpoint) {
  const res = await api.get(endpoint);
  return res.data;
}

// Main export runner
async function runExport() {
  const timestamp = dayjs().format("YYYY-MM-DD_HHmmss");
  const outputDir = `./exports/${timestamp}`;
  await fs.ensureDir(outputDir);

  console.log(`\n🚀 Starting HighLevel export for Location: ${LOCATION_ID}`);
  console.log(`📁 Output: ${outputDir}\n`);

  for (const resource of RESOURCES) {
    try {
      console.log(`🔄 Fetching ${resource.name} ...`);
      const data = await fetchResource(resource.path);

      const filePath = `${outputDir}/${resource.name}.json`;
      await fs.writeJson(filePath, data, { spaces: 2 });

      console.log(`✅ Saved → ${filePath}\n`);
    } catch (err) {
      console.error(
        `❌ ERROR exporting ${resource.name}: ${err.response?.status || "NO STATUS"} - ${err.message}\n`
      );
    }
  }

  console.log("🎉 Export completed successfully!\n");
}

// Execute
runExport().catch((err) => {
  console.error("🔥 Fatal Error:", err.message);
  process.exit(1);
});
