// export-ghl.js
//
// GHL Config Exporter (No-PII)
// Pulls configuration data from a Go High Level (LeadConnector) Location via OAuth 2.0/internal app.
// Outputs structured JSON files inside /exports/YYYY-MM-DD_HHmmss/.

try {
  require("dotenv").config();
} catch (err) {
  if (err.code !== "MODULE_NOT_FOUND") throw err;
}

const axios = require("axios");
const fs = require("fs-extra");
const dayjs = require("dayjs");

const {
  OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET,
  OAUTH_REFRESH_TOKEN,
  OAUTH_ACCESS_TOKEN,
  LOCATION_ID
} = process.env;

if (!LOCATION_ID) {
  console.error("\n[ERROR] LOCATION_ID is required in the environment.\n");
  process.exit(1);
}

const hasStaticAccessToken = Boolean(OAUTH_ACCESS_TOKEN);
const authMode = hasStaticAccessToken ? "static" : "oauth";

if (!hasStaticAccessToken && (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET || !OAUTH_REFRESH_TOKEN)) {
  console.error(
    "\n[ERROR] OAuth credentials (OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REFRESH_TOKEN) are required when no static access token is provided.\n"
  );
  process.exit(1);
}

const BASE_URL = "https://rest.gohighlevel.com";
const OAUTH_BASE_URL = "https://services.leadconnectorhq.com";

let cachedAccessToken = authMode === "static" ? OAUTH_ACCESS_TOKEN : null;
let tokenExpiresAt = 0;

async function requestOAuthToken() {
  console.log("🔐 Requesting OAuth access token...");

  const response = await axios.post(
    `${OAUTH_BASE_URL}/oauth/token`,
    {
      grant_type: "refresh_token",
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      refresh_token: OAUTH_REFRESH_TOKEN
    },
    { headers: { "Content-Type": "application/json" }, timeout: 30000 }
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`OAuth token endpoint returned ${response.status}`);
  }

  const token = response.data?.access_token;
  const expiresIn = Number(response.data?.expires_in) || 0;

  if (!token) {
    throw new Error("OAuth response missing access_token");
  }

  const bufferMs = 60 * 1000;
  const ttlMs = expiresIn ? Math.max(expiresIn * 1000 - bufferMs, 15000) : 0;
  tokenExpiresAt = Date.now() + ttlMs;
  return token;
}

async function getAccessToken() {
  if (authMode === "static") {
    return OAUTH_ACCESS_TOKEN;
  }

  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  cachedAccessToken = await requestOAuthToken();
  return cachedAccessToken;
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 90000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    Version: "2021-07-28"
  },
  validateStatus: () => true
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  config.headers = config.headers || {};
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (
      response &&
      response.status === 401 &&
      authMode === "oauth" &&
      config &&
      !config._retry
    ) {
      config._retry = true;
      try {
        cachedAccessToken = await requestOAuthToken();
        config.headers.Authorization = `Bearer ${cachedAccessToken}`;
        return api(config);
      } catch (tokenError) {
        return Promise.reject(tokenError);
      }
    }
    return Promise.reject(error);
  }
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function apiGet(path, params = {}) {
  console.log("DEBUG REQUEST:", path, params);
  const maxRetries = 5;
  let attempt = 0;
  let delay = 1000;

  while (true) {
    const response = await api.get(path, { params });

    if (response.status === 429 && attempt < maxRetries) {
      attempt++;
      await sleep(delay);
      delay = Math.min(delay * 2, 10000);
      continue;
    }

    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }

    throw new Error(`API get ${path} → ${response.status}`);
  }
}

async function fetchAll(path, params = {}) {
  const all = [];
  let nextPageToken = null;

  do {
    const requestParams = { ...params };
    if (nextPageToken) requestParams.nextPageToken = nextPageToken;

    const data = await apiGet(path, requestParams);

    const items = Array.isArray(data)
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

const resolveId = (entity) => entity?.id || entity?.funnelId || entity?._id;

async function fetchFunnelsWithDetails() {
  const list = await fetchAll("/funnels/funnel/list", { locationId: LOCATION_ID });
  const details = [];

  for (const funnel of list) {
    const funnelId = resolveId(funnel);
    if (!funnelId) continue;

    try {
      details.push(await apiGet(`/funnels/funnel/${funnelId}`, { locationId: LOCATION_ID }));
    } catch (err) {
      console.log(`❌ ERROR fetching funnel detail ${funnelId}: ${err.message}`);
    }
  }

  return { list, details };
}

async function fetchFunnelPagesWithDetails(funnels = []) {
  const pages = [];
  const pageDetails = [];

  for (const funnel of funnels) {
    const funnelId = resolveId(funnel);
    if (!funnelId) continue;

    const funnelPages = await fetchAll("/funnels/page/list", {
      locationId: LOCATION_ID,
      funnelId
    });

    pages.push(...funnelPages);

    for (const page of funnelPages) {
      const pageId = page?.id || page?._id;
      if (!pageId) continue;

      try {
        const detail = await apiGet(`/funnels/page/${pageId}`, { locationId: LOCATION_ID });
        pageDetails.push(detail);
      } catch (err) {
        console.log(`❌ ERROR fetching funnel page detail ${pageId}: ${err.message}`);
      }
    }
  }

  return { pages, pageDetails };
}

async function fetchEmails() {
  const templates = await fetchAll("/emails/builder/templates", { locationId: LOCATION_ID });
  const schedule = await fetchAll("/emails/schedule", { locationId: LOCATION_ID });
  return { templates, schedule };
}

async function fetchPipelines() {
  return await fetchAll("/opportunities/pipelines", { locationId: LOCATION_ID });
}

function extractPipelineStages(pipelines = []) {
  const stages = [];
  for (const pipeline of pipelines) {
    const items = Array.isArray(pipeline.stages) ? pipeline.stages : [];
    items.forEach((stage) => {
      stages.push({ pipelineId: pipeline.id || pipeline.pipelineId || null, ...stage });
    });
  }
  return stages;
}

async function preflightCheck(cache) {
  console.log("🔍 Validating OAuth credentials via location metadata...");
  console.log("DEBUG TOKEN MODE:", authMode);
  console.log("DEBUG LOCATION:", LOCATION_ID);
  console.log("DEBUG TOKEN (first 25):", (await getAccessToken()).slice(0, 25));
  const metadata = await apiGet(`/locations/${LOCATION_ID}`);
  cache["location-settings"] = metadata;
  cache["location-name"] = metadata?.name || LOCATION_ID;
  console.log(`✅ Location ${cache["location-name"]} accessible via OAuth.`);
}

const RESOURCES = [
  {
    name: "location-settings",
    fetchFn: async (cache) => cache["location-settings"] || (await apiGet(`/locations/${LOCATION_ID}`))
  },
  {
    name: "workflows",
    path: "/workflows/",
    useFetchAll: true,
    params: { locationId: LOCATION_ID, include: "triggers" }
  },
  {
    name: "funnels",
    fetchFn: async (cache) => {
      const data = await fetchFunnelsWithDetails();
      cache["funnels"] = data.list;
      cache["funnels-details"] = data.details;
      return data;
    }
  },
  {
    name: "funnel-pages",
    fetchFn: async (cache) => {
      const data = await fetchFunnelPagesWithDetails(cache["funnels"] || []);
      cache["funnel-pages"] = data.pages;
      cache["funnel-page-details"] = data.pageDetails;
      return data;
    }
  },
  {
    name: "funnels-pagecount",
    path: "/funnels/pagecount",
    params: { locationId: LOCATION_ID }
  },
  {
    name: "funnels-redirects",
    path: "/funnels/redirect/list",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "forms",
    path: "/forms/",
    useFetchAll: true,
    params: { locationId: LOCATION_ID, includeElements: true }
  },
  {
    name: "surveys",
    path: "/surveys/",
    useFetchAll: true,
    params: { locationId: LOCATION_ID, includeElements: true }
  },
  {
    name: "calendars",
    path: "/calendars/",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "calendar-events",
    path: "/calendars/events",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "calendar-groups",
    path: "/calendars/groups",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "calendar-resources",
    path: "/calendars/resources",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "custom-values",
    path: `/locations/${LOCATION_ID}/customValues`,
    useFetchAll: true
  },
  {
    name: "custom-fields",
    path: `/locations/${LOCATION_ID}/customFields`,
    useFetchAll: true
  },
  {
    name: "tags",
    path: `/locations/${LOCATION_ID}/tags`,
    useFetchAll: true
  },
  {
    name: "templates",
    path: `/locations/${LOCATION_ID}/templates`,
    useFetchAll: true
  },
  {
    name: "medias",
    path: "/medias/",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "emails",
    fetchFn: async () => fetchEmails()
  },
  {
    name: "kb",
    path: "/knowledge-bases/",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "conversation-ai",
    path: "/conversation-ai/models",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "agent-studio",
    path: "/agent-studio/agents",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "pipelines",
    fetchFn: async (cache) => {
      const pipelines = await fetchPipelines();
      cache["pipelines"] = pipelines;
      return pipelines;
    }
  },
  {
    name: "pipeline-stages",
    fetchFn: async (cache) => extractPipelineStages(cache["pipelines"] || [])
  },
  {
    name: "products",
    path: "/products/",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "prices",
    path: "/products/prices",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "collections",
    path: "/products/collections",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "orders",
    path: "/payments/orders",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "transactions",
    path: "/payments/transactions",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "subscriptions",
    path: "/payments/subscriptions",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "coupons",
    path: "/payments/coupons",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  },
  {
    name: "links",
    path: "/links/",
    useFetchAll: true,
    params: { locationId: LOCATION_ID }
  }
];

async function runExport() {
  const ts = dayjs().format("YYYY-MM-DD_HHmmss");
  const outputDir = `./exports/${ts}`;
  await fs.ensureDir(outputDir);

  const cache = {};
  const results = { attempted: 0, succeeded: 0, failed: [] };

  console.log(`\n🚀 Starting HighLevel export for Location: ${LOCATION_ID}`);
  console.log(`📁 Output: ${outputDir}\n`);

  try {
    await preflightCheck(cache);
  } catch (err) {
    console.error(`❌ Preflight failed: ${err.message}`);
    process.exit(1);
  }

  for (const resource of RESOURCES) {
    results.attempted++;
    console.log(`🔄 Fetching ${resource.name} ...`);

    try {
      let data;
      if (resource.fetchFn) {
        data = await resource.fetchFn(cache);
      } else if (resource.useFetchAll) {
        data = await fetchAll(resource.path, resource.params || {});
      } else {
        data = await apiGet(resource.path, resource.params || {});
      }

      const filePath = `${outputDir}/${resource.name}.json`;
      await fs.writeJson(filePath, data ?? null, { spaces: 2 });
      cache[resource.name] = data;
      results.succeeded++;
      console.log(`✅ Saved ${resource.name}`);
    } catch (err) {
      results.failed.push({ name: resource.name, error: err.message });
      console.log(`❌ ERROR exporting ${resource.name}: ${err.message}`);
    }
  }

  console.log("\n📊 Export Summary");
  console.log(`  Resources attempted: ${results.attempted}`);
  console.log(`  Successes: ${results.succeeded}`);
  console.log(`  Failures: ${results.failed.length}`);

  if (results.failed.length > 0) {
    results.failed.forEach((failure) => {
      console.log(`    - ${failure.name}: ${failure.error}`);
    });
    console.error("\n⚠️ Export completed with errors. Check logs for details.");
    process.exit(1);
  }

  console.log("\n🎉 Export Completed Without Errors!\n");
}

runExport().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
