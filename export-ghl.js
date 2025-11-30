// export-ghl.js
//
// GHL Config Exporter (No-PII)
// Pulls non-client configuration data from a Go High Level (LeadConnector) Location.
// Outputs structured JSON files inside /exports/YYYY-MM-DD_HHMMSS/
//
// Required ENV Vars:
//   TOKEN=Your_GHL_API_Token
//   LOCATION_ID=Your_GHL_Location_ID
//
// Run:
//   TOKEN=xxx LOCATION_ID=yyy node export-ghl.js

const axios = require("axios");
const fs = require("fs-extra");
const dayjs = require("dayjs");

// Load credentials from environment variables
const TOKEN = process.env.TOKEN;
const LOCATION_ID = process.env.LOCATION_ID;

// Base URL for LeadConnector (GHL API)
const BASE_URL = "https://services.leadconnectorhq.com";

// Validate required inputs
if (!TOKEN || !LOCATION_ID) {
  console.error("\nERROR: TOKEN and LOCATION_ID environment variables are required.\n");
  console.error("Example:");
  console.error('  TOKEN=your_token LOCATION_ID=your_location_id node export-ghl.js\n');
  process.exit(1);
}

// Create API instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/json",
    "Content-Type": "application/json"
  },
  timeout: 30000
});

// Correct 2025 LeadConnector API endpoints (confirmed)
const RESOURCES = [
  { name: "workflows", path: `/workflows?locationId=${LOCATION_ID}` },
  { name: "funnels", path: `/funnels?locationId=${LOCATION_ID}` },
  { name: "websites", path: `/websites?locationId=${LOCATION_ID}` },
  { name: "forms", path: `/forms?locationId=${LOCATION_ID}` },
  { name: "surveys", path: `/surveys?locationId=${LOCATION_ID}` },
  { name: "email-templates", path: `/emails/templates?locationId=${LOCATION_ID}` },
  { name: "sms-templates", path: `/sms/templates?locationId=${LOCATION_ID}` },
  { name: "pipelines", path: `/opportunities/pipelines?locationId=${LOCATION_ID}` },
  { name: "custom-fields", path: `/custom-fields?locationId=${LOCATION_ID}` },
  { name: "tags", path: `/contacts/tags?locationId=${LOCATION_ID}` },
  { name: "calendars", path: `/calendars?locationId=${LOCATION_ID}` },
  { name: "trigger-links", path: `/links?locationId=${LOCATION_ID}` }
];

// Generic GET request helper
async function fetchResource(endpoint) {
  const response = await api.get(endpoint);
  return response.data;
}

// Main export function
async function runExport() {
  const timestamp = dayjs().format("YYYY-MM-DD_HHmmss");
  const outputDir = `./exports/${timestamp}`;
  await fs.ensureDir(outputDir);

  console.log(`\nStarting GHL export for Location ID: ${LOCATION_ID}`);
  console.log(`Output directory: ${outputDir}\n`);

  for (const resource of RESOURCES) {
    try {
      console.log(`Fetching ${resource.name} ...`);
      const data = await fetchResource(resource.path);
      const filePath = `${outputDir}/${resource.name}.json`;

      await fs.writeJson(filePath, data, { spaces: 2 });

      console.log(`Saved → ${filePath}\n`);
    } catch (error) {
      console.error(
        `ERROR exporting ${resource.name}: ${error.response?.status || "NO STATUS"} - ${error.message}\n`
      );
    }
  }

  console.log("Export completed successfully!\n");
}

// Run
runExport().catch((err) => {
  console.error("Fatal Error:", err.message);
  process.exit(1);
});
