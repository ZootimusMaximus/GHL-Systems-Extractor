// export-ghl.js
//
// GHL Config Exporter (No-PII)
// Pulls non-client configuration data from a Go High Level (LeadConnector) Location.
// Outputs structured JSON files inside /exports/YYYY-MM-DD_HHmmss/

try {
  require("dotenv").config();
} catch (err) {
  if (err.code !== "MODULE_NOT_FOUND") throw err;
}

const axios = require("axios");
const fs = require("fs-extra");
const dayjs = require("dayjs");

// ========= ENV =============
const TOKEN = process.env.TOKEN;
const LOCATION_ID = process.env.LOCATION_ID;

if (!TOKEN || !LOCATION_ID) {
  console.error("\n[ERROR] TOKEN and LOCATION_ID env vars are required.\n");
  console.error("Example:");
  console.error("  TOKEN=xxx LOCATION_ID=yyy node export-ghl.js\n");
  process.exit(1);
}

const BASE_URL = "https://services.leadconnectorhq.com";

// ========= AXIOS CLIENT =============
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    Version: "2021-07-28"
  },
  timeout: 90000,
  validateStatus: () => true
});

// ========= HELPERS ============
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiGet(path, params = {}) {
  console.log("DEBUG REQUEST:", path, params);

  const maxRetries = 5;
  let attempt = 0;
  let delay = 1000;

  while (true) {
    const res = await api.get(path, { params });

    if (res.status === 429 && attempt < maxRetries) {
      attempt++;
      await sleep(delay);
      delay = Math.min(delay * 2, 10000);
      continue;
    }

    if (res.status >= 200 && res.status < 300) return res.data;

    throw new Error(`API get ${path} → ${res.status}`);
  }
}

async function fetchAll(path, params = {}) {
  const all = [];
  let nextPageToken = null;

  do {
    const p = { ...params };
    if (nextPageToken) p.nextPageToken = nextPageToken;

    const data = await apiGet(path, p);

    const items =
      Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.data)
        ? data.data
        : [];

    all.push(...items);
    nextPageToken = data.nextPageToken || null;
  } while (nextPageToken);

  return all;
}

// Funnel pages wrapper
async function fetchFunnelPages(funnels) {
  const pages = [];

  for (const f of funnels || []) {
    const funnelId = f.id || f.funnelId || f._id;
    if (!funnelId) continue;

    const data = await fetchAll("/funnels/page/list", {
      locationId: LOCATION_ID,
      funnelId
    });

    pages.push(...data);
  }

  return pages;
}

// ========= PRIVATE API ENDPOINTS (DEC 2025) ============
const RESOURCES = [
  {
    name: "workflows",
    path: "/workflows/",
    useFetchAll: true,
    params: { locationId: LOCATION_ID, include: "triggers" }
  },
  {
    name: "funnels",
    path: "/funnels/funnel/list",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "forms",
    path: "/forms/",
    useFetchAll: false,
    params: { locationId: LOCATION_ID, includeElements: true }
  },
  {
    name: "surveys",
    path: "/surveys/",
    useFetchAll: false,
    params: { locationId: LOCATION_ID, includeElements: true }
  },
  {
    name: "email-templates",
    path: "/emails/builder/templates",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "pipelines",
    path: "/opportunities/pipelines",
    useFetchAll: false,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "custom-fields",
    path: `/locations/${LOCATION_ID}/customFields`,
    useFetchAll: false
  },
  {
    name: "custom-values",
    path: `/locations/${LOCATION_ID}/customValues`,
    useFetchAll: false
  },
  {
    name: "tags",
    path: `/locations/${LOCATION_ID}/tags`,
    useFetchAll: false
  },
  {
    name: "links",
    path: "/links/",
    useFetchAll: false,
    params: { locationId: LOCATION_ID, include: "stats" }
  },
  {
    name: "calendars",
    path: "/calendars/",
    useFetchAll: false,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "calendar-groups",
    path: "/calendars/groups",
    useFetchAll: false,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "calendar-resources",
    path: "/calendars/resources",
    useFetchAll: false,
    params: { locationId: LOCATION_ID }
  }
];

// ========= MAIN =============
async function runExport() {
  const ts = dayjs().format("YYYY-MM-DD_HHmmss");
  const outputDir = `./exports/${ts}`;
  await fs.ensureDir(outputDir);

  const cache = {};

  console.log(`\n🚀 Starting HighLevel export for Location: ${LOCATION_ID}`);
  console.log(`📁 Output: ${outputDir}\n`);

  for (const r of RESOURCES) {
    console.log(`🔄 Fetching ${r.name} ...`);

    try {
      let data;

      if (r.name === "funnel-pages") {
        data = await fetchFunnelPages(cache["funnels"]);
      } else {
        data = r.useFetchAll
          ? await fetchAll(r.path, r.params || {})
          : await apiGet(r.path, r.params || {});
      }

      const filePath = `${outputDir}/${r.name}.json`;
      await fs.writeJson(filePath, data, { spaces: 2 });

      cache[r.name] = data;

      console.log(`✅ Saved ${r.name}`);
    } catch (err) {
      console.log(`❌ ERROR exporting ${r.name}: ${err.message}`);
    }
  }

  // Funnel pages AFTER funnels are fetched
  console.log(`\n🔄 Fetching funnel-pages ...`);
  const funnelPages = await fetchFunnelPages(cache["funnels"]);
  await fs.writeJson(`${outputDir}/funnel-pages.json`, funnelPages, { spaces: 2 });
  console.log(`✅ Saved funnel-pages`);

  console.log("\n🎉 Export Completed!\n");
}

runExport().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});