// ======================================================
//  GHL Config Exporter (No-PII) – v2 (Nov 2025 Safe Build)
// ======================================================
//  Exports HighLevel configuration data from one Location.
//  Fully safe, no-P.I.I., audits only.
// ======================================================

const axios = require("axios");
const fs = require("fs-extra");
const dayjs = require("dayjs");

// ENV Vars Required:
const TOKEN = process.env.TOKEN;
const LOCATION_ID = process.env.LOCATION_ID;

if (!TOKEN || !LOCATION_ID) {
  console.error("\n❌ ERROR: Missing TOKEN or LOCATION_ID");
  console.error("Usage:");
  console.error("TOKEN=xxx LOCATION_ID=yyy node export-ghl.js\n");
  process.exit(1);
}

// ----------------------
// Axios Client
// ----------------------
const api = axios.create({
  baseURL: "https://services.leadconnectorhq.com",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "Accept-Version": "2021-07-28"
  },
  timeout: 90000,
  validateStatus: () => true
});

// ----------------------
// Retry / Backoff Logic
// ----------------------
async function apiRequest(method, url, params = {}) {
  let attempt = 0;

  while (attempt < 5) {
    const res = await api.request({ method, url, params });

    // Success
    if (res.status < 300) return res.data;

    // Retry 429
    if (res.status === 429) {
      const wait = Math.min(10000, (attempt + 1) * 1500);
      console.log(`⏳ Throttled (429). Retrying in ${wait}ms...`);
      await new Promise(r => setTimeout(r, wait));
      attempt++;
      continue;
    }

    // Hard fail
    throw new Error(`API ${method} ${url} → ${res.status}`);
  }

  throw new Error(`429 Timeout after 5 retries: ${url}`);
}

// ----------------------
// Resources To Export
// ----------------------
const EXPORTS = [
  {
    name: "workflows",
    url: "/workflows/",
    params: { locationId: LOCATION_ID, include: "triggers" }
  },

  { name: "funnels", url: `/funnels/funnel/list/${LOCATION_ID}` },
  { name: "funnel-pages", url: `/funnels/page/list/${LOCATION_ID}` },

  {
    name: "forms",
    url: `/forms/location/${LOCATION_ID}`,
    params: { includeElements: true }
  },

  {
    name: "surveys",
    url: `/surveys/location/${LOCATION_ID}`,
    params: { includeElements: true }
  },

  {
    name: "email-templates",
    url: `/emails/builder/template/location/${LOCATION_ID}`
  },

  {
    name: "templates-legacy",
    url: `/locations/${LOCATION_ID}/templates`
  },

  { name: "pipelines", url: `/opportunities/pipelines/location/${LOCATION_ID}` },

  { name: "custom-fields", url: `/locations/${LOCATION_ID}/customFields` },

  { name: "custom-values", url: `/locations/${LOCATION_ID}/customValues` },

  { name: "tags", url: `/locations/${LOCATION_ID}/tags` },

  {
    name: "trigger-links",
    url: `/links/location/${LOCATION_ID}`,
    params: { include: "stats" }
  },

  { name: "calendars", url: `/calendars/location/${LOCATION_ID}` }
];

// ----------------------
// Export Runner
// ----------------------
async function run() {
  const stamp = dayjs().format("YYYY-MM-DD_HHmmss");
  const outDir = `./exports/${stamp}`;
  await fs.ensureDir(outDir);

  console.log(`\n🚀 Starting HighLevel export for Location: ${LOCATION_ID}`);
  console.log(`📁 Output: ${outDir}\n`);

  for (const item of EXPORTS) {
    console.log(`🔄 Fetching ${item.name} ...`);
    try {
      const data = await apiRequest("get", item.url, item.params || {});
      const path = `${outDir}/${item.name}.json`;
      await fs.writeJson(path, data, { spaces: 2 });
      console.log(`✅ Saved → ${path}\n`);
    } catch (err) {
      console.log(`❌ ERROR exporting ${item.name}: ${err.message}\n`);
    }
  }

  console.log("🎉 Export completed!\n");
}

// Run it
run().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
