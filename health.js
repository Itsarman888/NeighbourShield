export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const configured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return res.status(200).json({
    ok: true,
    app: "NeighbourShield",
    storage: configured ? "supabase" : "demo",
    message: configured ? "Cloud storage configured" : "Demo mode: reports stay in this browser only"
  });
}
