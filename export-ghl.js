// ==============================================
// GHL Config Exporter – FIXED VERSION
// LeadConnector ONLY – no /locations preflight
// ==============================================

try { require("dotenv").config(); } catch {}

const axios = require("axios");
const fs = require("fs-extra");
const dayjs = require("dayjs");

// -----------------------------------------------------
// ENV
// -----------------------------------------------------

const {
  OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET,
  OAUTH_REFRESH_TOKEN,
  OAUTH_ACCESS_TOKEN,
  LOCATION_ID
} = process.env;

if (!LOCATION_ID) throw new Error("LOCATION_ID is required");

// OAuth mode vs static
const authMode = OAUTH_ACCESS_TOKEN ? "static" : "oauth";

// LeadConnector routing
const OAUTH_BASE = "https://services.leadconnectorhq.com";
const API_BASE   = "https://services.leadconnectorhq.com";

// OAuth caching
let cached = authMode === "static" ? OAUTH_ACCESS_TOKEN : null;
let expiresAt = 0;

// ======================================================
// REFRESH TOKEN (form-urlencoded)
// ======================================================
async function refreshOAuth() {
  console.log("🔐 Refreshing OAuth token...");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: OAUTH_CLIENT_ID,
    client_secret: OAUTH_CLIENT_SECRET,
    refresh_token: OAUTH_REFRESH_TOKEN
  });

  const r = await axios.post(
    `${OAUTH_BASE}/oauth/token`,
    body.toString(),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    }
  );

  if (r.status < 200 || r.status >= 300) {
    console.error("❌ OAuth refresh failed:", r.status, r.data);
    throw new Error("OAuth refresh failed " + r.status);
  }

  const token = r.data?.access_token;
  const ttl = (r.data?.expires_in || 0) * 1000;

  if (!token) throw new Error("No access_token in OAuth response");

  // 60s safety buffer
  expiresAt = Date.now() + ttl - 60000;
  return token;
}

async function accessToken() {
  if (authMode === "static") return OAUTH_ACCESS_TOKEN;
  if (cached && Date.now() < expiresAt) return cached;

  cached = await refreshOAuth();
  return cached;
}

// ======================================================
// Axios client
// ======================================================
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    Version: "2021-07-28"
  }
});

api.interceptors.request.use(async (config) => {
  const token = await accessToken();
  config.headers = config.headers || {};
  config.headers.Authorization = "Bearer " + token;
  return config;
});

// ======================================================
// Helpers
// ======================================================

// FIXED: support arrayKey
async function apiGet(path, params = {}) {
  console.log("DEBUG API:", path, params);
  const r = await api.get(path, { params });
  if (r.status >= 200 && r.status < 300) return r.data;
  throw new Error(`${path} → ${r.status}`);
}

// FIXED: require arrayKey
async function listAll(path, params = {}, arrayKey) {
  const out = [];
  let nextPageToken = null;

  do {
    const r = await apiGet(path, {
      ...params,
      ...(nextPageToken && { nextPageToken })
    });

    // FIX: extract items by arrayKey only
    const items = Array.isArray(r[arrayKey]) ? r[arrayKey] : [];
    out.push(...items);

    nextPageToken = r.nextPageToken || null;
  } while (nextPageToken);

  return out;
}

// ======================================================
// PRE-FLIGHT
// ======================================================
async function preflight(cache) {
  console.log("🔍 Checking location access…");

  const res = await apiGet("/funnels/funnel/list", {
    locationId: LOCATION_ID,
    limit: 1
  });

  cache.locationInfo = { id: LOCATION_ID };
}

// ======================================================
// RESOURCES
// ======================================================
async function run() {
  const ts = dayjs().format("YYYY-MM-DD_HHmmss");
  const out = `./exports/${ts}`;
  await fs.ensureDir(out);

  const cache = {};

  console.log("\n🚀 Exporting LC Config for", LOCATION_ID, "\n");
  await preflight(cache);

  const resources = [
    {
      name: "funnels",
      fetch: () => listAll("/funnels/funnel/list", { locationId: LOCATION_ID }, "funnels")
    },
    {
      name: "workflows",
      fetch: () => listAll("/workflows/", { locationId: LOCATION_ID }, "workflows")
    },
    {
      name: "forms",
      fetch: () => listAll("/forms/", { locationId: LOCATION_ID }, "forms")
    },
    {
      name: "surveys",
      fetch: () => listAll("/surveys/", { locationId: LOCATION_ID }, "surveys")
    },
    {
      name: "tags",
      fetch: () => listAll(`/locations/${LOCATION_ID}/tags`, {}, "tags")
    }
  ];

  for (const r of resources) {
    try {
      console.log("→", r.name);
      const data = await r.fetch(cache);
      await fs.writeJson(`${out}/${r.name}.json`, data, { spaces: 2 });
      console.log("✔ saved", r.name);
    } catch (err) {
      console.warn("❌", r.name, err.message);
    }
  }

  console.log("\n✨ Done.\n");
}

run().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
