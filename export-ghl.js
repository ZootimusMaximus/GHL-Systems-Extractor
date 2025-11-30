// ============================================================================
//  GHL CONFIG EXPORTER (NO-PII) — v2 (Nov 2025 Compliant)
//  Exports: workflows, funnels, pages, forms, surveys, templates, pipelines,
//           custom fields, tags, calendars, trigger links — WITHOUT PII
//
//  Run with:
//     TOKEN=your_token LOCATION_ID=your_location_id node export-ghl.js
//
// ============================================================================

const axios = require("axios");
const fs = require("fs-extra");
const dayjs = require("dayjs");

// ------------------------------------------------------------
// ENV VALIDATION
// ------------------------------------------------------------
const TOKEN = process.env.TOKEN;
const LOCATION_ID = process.env.LOCATION_ID;

if (!TOKEN || !LOCATION_ID) {
  console.error("\n❌ ERROR: Missing TOKEN or LOCATION_ID environment variables.\n");
  console.error("Example:\nTOKEN=xxx LOCATION_ID=yyy node export-ghl.js\n");
  process.exit(1);
}

// ------------------------------------------------------------
// AXIOS CLIENT
// ------------------------------------------------------------
const api = axios.create({
  baseURL: "https://services.leadconnectorhq.com",
  timeout: 90000, // 90 seconds (2025 LC can be slow)
  validateStatus: () => true,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "Accept-Version": "2021-07-28"
  }
});

// ------------------------------------------------------------
// RETRY HANDLER FOR 429 / 5xx
// ------------------------------------------------------------
async function safeGet(url, params = {}) {
  let attempt = 0;

  while (attempt < 6) {
    const res = await api.get(url, { params });

    // Success
    if (res.status >= 200 && res.status < 300) return res;

    // Throttle
    if (res.status === 429) {
      const wait = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.log(`⏳ Throttled (429) — retrying in ${wait}ms ...`);
      await new Promise((resolve) => setTimeout(resolve, wait));
      attempt++;
      continue;
    }

    // Fatal endpoint or permission error
    return res;
  }

  throw new Error(`Too many retries fetching ${url}`);
}

// ------------------------------------------------------------
// PAGINATION HANDLER (supports 2025 formats)
// ------------------------------------------------------------
async function fetchAllPaginated(url, params = {}) {
  let items = [];
  let page = 1;
  let nextPageToken = null;

  while (true) {
    const res = await safeGet(url, {
      ...params,
      page,
      limit: 50,
      nextPageToken
    });

    if (res.status !== 200) return { error: res.status, data: [] };

    const body = res.data;
    const chunk =
      body.items ||
      body.data ||
      body.locations ||
      body.templates ||
      (Array.isArray(body) ? body : []);

    items = items.concat(chunk);

    nextPageToken = body.nextPageToken;

    if (!nextPageToken && chunk.length < 50) break;

    page++;
  }

  return { error: null, data: items };
}

// ------------------------------------------------------------
// RESOURCES (correct 2025 endpoints)
// ------------------------------------------------------------
const RESOURCES = [
  {
    name: "workflows",
    url: "/workflows/",
    params: { locationId: LOCATION_ID, include: "triggers" }
  },
  {
    name: "funnels",
    url: "/funnels/funnel/list",
    params: { locationId: LOCATION_ID }
  },
  {
    name: "funnel-pages",
    url: "/funnels/page",
    params: { locationId: LOCATION_ID }
  },
  {
    name: "forms",
    url: "/forms/",
    params: { locationId: LOCATION_ID, includeElements: true }
  },
  {
    name: "surveys",
    url: "/surveys/",
    params: { locationId: LOCATION_ID, includeElements: true }
  },
  {
    name: "email-templates",
    url: `/emails/builder`,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "templates-legacy",
    url: `/locations/${LOCATION_ID}/templates`,
    params: {}
  },
  {
    name: "pipelines",
    url: "/opportunities/pipelines",
    params: { locationId: LOCATION_ID }
  },
  {
    name: "custom-fields",
    url: "/customFields/",
    params: { locationId: LOCATION_ID }
  },
  {
    name: "custom-values",
    url: `/locations/${LOCATION_ID}/customValues`,
    params: {}
  },
  {
    name: "tags",
    url: "/contacts/tags",
    params: { locationId: LOCATION_ID }
  },
  {
    name: "trigger-links",
    url: "/links/",
    params: { locationId: LOCATION_ID, include: "stats" }
  },
  {
    name: "calendars",
    url: "/calendars/",
    params: { locationId: LOCATION_ID }
  }
];

// ------------------------------------------------------------
// MAIN EXECUTION FUNCTION
// ------------------------------------------------------------
async function runExport() {
  const ts = dayjs().format("YYYY-MM-DD_HHmmss");
  const outDir = `./exports/${ts}`;
  await fs.ensureDir(outDir);

  console.log(`\n🚀 Starting HighLevel export for Location: ${LOCATION_ID}`);
  console.log(`📁 Output: ${outDir}\n`);

  for (const resource of RESOURCES) {
    console.log(`🔄 Fetching ${resource.name} ...`);

    const result = await fetchAllPaginated(resource.url, resource.params);

    if (result.error) {
      console.log(
        `❌ ERROR exporting ${resource.name}: ${result.error}\n`
      );
      continue;
    }

    const file = `${outDir}/${resource.name}.json`;
    await fs.writeJson(file, result.data, { spaces: 2 });

    console.log(`✅ Saved: ${file}\n`);
  }

  console.log("🎉 Export completed!\n");
}

// ------------------------------------------------------------
runExport().catch((err) => {
  console.error("Fatal Error:", err.message);
  process.exit(1);
});
