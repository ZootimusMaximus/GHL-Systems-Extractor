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

// Define exportable endpoints (no PII)
const RESOURCES = [
  { name: "workflows", path: `/locations/${LOCATION_ID}/workflows` },
  { name: "funnels", path: `/locations/${LOCATION_ID}/funnels` },
  { name: "websites", path: `/locations/${LOCATION_ID}/websites` },
  { name: "forms", path: `/locations/${LOCATION_ID}/forms` },
  { name: "surveys", path: `/locations/${LOCATION_ID}/surveys` },
  { name: "email-templates", path: `/locations/${LOCATION_ID}/marketing/emails/templates` },
  { name: "sms-templates", path: `/locations/${LOCATION_ID}/marketing/sms/templates` },
  { name: "pipelines", path: `/locations/${LOCATION_ID}/pipelines` },
  { name: "custom-fields", path: `/locations/${LOCATION_ID}/custom-fields` },
  { name: "tags", path: `/locations/${LOCATION_ID}/tags` },
  { name: "calendars", path: `/locations/${LOCATION_ID}/calendars` },
  { name: "trigger-links", path: `/locations/${LOCATION_ID}/trigger-links` }
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
      console.error(`ERROR exporting ${resource.name}: ${error.response?.status || "NO STATUS"} - ${error.message}\n`);
    }
  }

  console.log("Export completed successfully!\n");
}

runExport().catch((err) => {
  console.error("Fatal Error:", err.message);
  process.exit(1);
});
