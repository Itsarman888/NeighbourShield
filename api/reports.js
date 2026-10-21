const MAX_DETAILS = 500;
const allowedCategories = new Set(["Road hazard", "Medical help needed", "Fire / smoke", "Flooding", "Unsafe area", "Other"]);
const allowedSeverities = new Set(["Low", "Medium", "High", "Critical"]);

function configured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function headers() {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json"
  };
}
function validReport(body) {
  return body && typeof body.category === "string" && allowedCategories.has(body.category) &&
    typeof body.severity === "string" && allowedSeverities.has(body.severity) &&
    typeof body.details === "string" && body.details.trim().length >= 8 &&
    body.details.length <= MAX_DETAILS &&
    Number.isFinite(Number(body.lat)) && Number(body.lat) >= 6 && Number(body.lat) <= 38 &&
    Number.isFinite(Number(body.lng)) && Number(body.lng) >= 68 && Number(body.lng) <= 98 &&
    (body.area === undefined || (typeof body.area === "string" && body.area.length <= 100));
}
function safeRow(row) {
  return {
    id: row.id,
    category: row.category,
    severity: row.severity,
    details: row.details,
    area: row.area || "",
    lat: Number(row.lat),
    lng: Number(row.lng),
    created_at: row.created_at
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(204).end();
  }
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!configured()) {
    return res.status(503).json({
      error: "Cloud storage is not configured yet.",
      mode: "demo",
      hint: "Use browser demo mode, or configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel."
    });
  }
  const base = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/reports`;
  try {
    if (req.method === "GET") {
      const response = await fetch(`${base}?select=id,category,severity,details,area,lat,lng,created_at&order=created_at.desc&limit=100`, {
        headers: headers()
      });
      const data = await response.json();
      if (!response.ok) return res.status(502).json({ error: "Could not load community reports." });
      return res.status(200).json({ reports: data.map(safeRow), mode: "cloud" });
    }
    if (!validReport(req.body)) return res.status(400).json({ error: "Check the report fields and map location, then try again." });
    const record = {
      category: req.body.category,
      severity: req.body.severity,
      details: req.body.details.trim(),
      area: (req.body.area || "").trim(),
      lat: Number(req.body.lat),
      lng: Number(req.body.lng)
    };
    const response = await fetch(`${base}?select=id,category,severity,details,area,lat,lng,created_at`, {
      method: "POST",
      headers: { ...headers(), Prefer: "return=representation" },
      body: JSON.stringify(record)
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: "Report could not be saved. Check the database setup." });
    return res.status(201).json({ report: safeRow(data[0]), mode: "cloud" });
  } catch {
    return res.status(500).json({ error: "The report service is temporarily unavailable." });
  }
}
