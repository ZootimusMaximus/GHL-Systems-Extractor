// export-ghl.js
//
// GHL Config Exporter (No-PII)
// Pulls non-client configuration data from a Go High Level (LeadConnector) Location.
// Outputs structured JSON files inside /exports/YYYY-MM-DD_HHmmss/
//
// Required ENV Vars:
//   TOKEN=Your_Private_Integration_Token
//   LOCATION_ID=Your_GHL_Location_ID
//
// Run:
//   TOKEN=xxx LOCATION_ID=yyy node export-ghl.js

const axios = require("axios");
const fs = require("fs-extra");
const dayjs = require("dayjs");

// ========= ENV =============

const TOKEN = process.env.TOKEN;
const LOCATION_ID = process.env.LOCATION_ID;

if (!TOKEN || !LOCATION_ID) {
  console.error("\n[ERROR] TOKEN and LOCATION_ID env vars are required.\n");
  console.error("Example:");
  console.error("  TOKEN=your_token LOCATION_ID=your_location_id node export-ghl.js\n");
  process.exit(1);
}

const BASE_URL = "https://services.leadconnectorhq.com";

// ========= AXIOS CLIENT (fixed auth) =============

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    // IMPORTANT: for Private Integrations, the token is sent *as-is*.
    // NO 'Bearer ' prefix. This was causing your 401s.
    Authorization: TOKEN,
    Accept: "application/json",
    Version: "2021-07-28"
  },
  timeout: 90000,
  validateStatus: () => true
});

// ========= HELPERS =============

// simple sleep
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// generic GET with retry for 429
async function apiGet(path, params = {}) {
  const maxRetries = 5;
  let attempt = 0;
  let delay = 1000;

  while (true) {
    const res = await api.get(path, { params });

    // rate limit
    if (res.status === 429 && attempt < maxRetries) {
      attempt += 1;
      await sleep(delay);
      delay = Math.min(delay * 2, 10000);
      continue;
    }

    // success
    if (res.status >= 200 && res.status < 300) {
      return res.data;
    }

    // hard fail
    throw new Error(`API get ${path} → ${res.status}`);
  }
}

// for endpoints that support pagination; if not, we still just return once
async function fetchAll(path, params = {}) {
  const all = [];
  let page = 1;
  let nextPageToken = null;

  do {
    const p = { ...params };
    if (nextPageToken) {
      p.nextPageToken = nextPageToken;
    } else {
      p.page = page;
      p.limit = p.limit || 100;
    }

    const data = await apiGet(path, p);

    let items;
    if (Array.isArray(data)) {
      items = data;
    } else if (Array.isArray(data.items)) {
      items = data.items;
    } else if (Array.isArray(data.data)) {
      items = data.data;
    } else {
      items = [];
    }

    all.push(...items);
    nextPageToken = data.nextPageToken || null;
    page += 1;
  } while (nextPageToken);

  return all;
}

// ========= RESOURCES TO EXPORT =============
//
// NOTE: some of these may still 404 if GHL changes paths,
// but the 401s will be gone after the auth fix.

const RESOURCES = [
  // workflows (uses include=triggers for full metadata)
  {
    name: "workflows",
    path: "/workflows/",
    useFetchAll: true,
    params: { locationId: LOCATION_ID, include: "triggers" }
  },

  // funnels + pages
  {
    name: "funnels",
    path: `/funnels/funnel/list/${LOCATION_ID}`,
    useFetchAll: false
  },
  {
    name: "funnel-pages",
    path: `/funnels/page/list/${LOCATION_ID}`,
    useFetchAll: false
  },

  // forms & surveys with elements
  {
    name: "forms",
    path: `/forms/location/${LOCATION_ID}`,
    useFetchAll: false,
    params: { includeElements: true }
  },
  {
    name: "surveys",
    path: `/surveys/location/${LOCATION_ID}`,
    useFetchAll: false,
    params: { includeElements: true }
  },

  // email builder templates (new)
  {
    name: "email-templates",
    path: `/emails/builder/template/location/${LOCATION_ID}`,
    useFetchAll: true
  },

  // legacy location templates (old email/SMS/etc)
  {
    name: "templates-legacy",
    path: `/locations/${LOCATION_ID}/templates`,
    useFetchAll: false
  },

  // pipelines
  {
    name: "pipelines",
    path: `/opportunities/pipelines/location/${LOCATION_ID}`,
    useFetchAll: false
  },

  // custom fields & values
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

  // tags
  {
    name: "tags",
    path: `/locations/${LOCATION_ID}/tags`,
    useFetchAll: false
  },

  // trigger links with stats
  {
    name: "trigger-links",
    path: `/links/location/${LOCATION_ID}`,
    useFetchAll: false,
    params: { include: "stats" }
  },

  // calendars
  {
    name: "calendars",
    path: `/calendars/location/${LOCATION_ID}`,
    useFetchAll: false
  }
];

// ========= MAIN =============

async function runExport() {
  const ts = dayjs().format("YYYY-MM-DD_HHmmss");
  const outputDir = `./exports/${ts}`;
  await fs.ensureDir(outputDir);

  console.log(`\n🚀 Starting HighLevel export for Location: ${LOCATION_ID}`);
  console.log(`📁 Output: ${outputDir}\n`);

  for (const r of RESOURCES) {
    const label = r.name;
    console.log(`🔄 Fetching ${label} ...`);

    try {
      const data = r.useFetchAll
        ? await fetchAll(r.path, r.params || {})
        : await apiGet(r.path, r.params || {});

      const filePath = `${outputDir}/${label}.json`;
      await fs.writeJson(filePath, data, { spaces: 2 });
      console.log(`✅ Saved ${label} → ${filePath}\n`);
    } catch (err) {
      console.log(`❌ ERROR exporting ${label}: ${err.message}\n`);
    }
  }

  console.log("🎉 Export completed!\n");
}

runExport().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
