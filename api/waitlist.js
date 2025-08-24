import { createClient } from "@supabase/supabase-js";

// Comma-separated list of allowed origins, e.g. "https://purge-diary.com,https://*.vercel.app"
// Use "*" during dev, then lock down.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map(s => s.trim());

function corsOrigin(req) {
  const origin = req.headers.origin || "*";
  if (ALLOWED_ORIGINS.includes("*")) return origin;
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || "*";
}

function setCORS(res, origin) {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

const emailRe = /^(?:[a-zA-Z0-9_'^&/+-])+(?:\.(?:[a-zA-Z0-9_'^&/+-])+)*@(?:(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})$/;

export default async function handler(req, res) {
  const origin = corsOrigin(req);

  if (req.method === "OPTIONS") {
    setCORS(res, origin);
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    setCORS(res, origin);
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    setCORS(res, origin);

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { email, name = null, note = null, consent = false, utm = {}, meta = {} } = body;

    if (!email || !emailRe.test(String(email).trim())) {
      return res.status(400).json({ ok: false, error: "Valid email required" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE;
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ ok: false, error: "Supabase env vars missing" });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const row = {
      email: String(email).trim().toLowerCase(),
      name,
      note,
      consent: !!consent,
      utm,
      tz: meta?.tz || null,
      ua: meta?.ua || null,
      ts: meta?.ts || new Date().toISOString(),
      ip: (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || null,
    };

    // Requires unique index on lower(email)
    const { error } = await supabase.from("waitlist").upsert([row], { onConflict: "email" });
    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("waitlist error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}