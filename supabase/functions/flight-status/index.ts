// flight-status — live status for one flight on one date, for the Austin 2026 trip page.
//
//   GET /functions/v1/flight-status?flight=AS540&date=2026-09-03
//
// Upstream is AeroDataBox (RapidAPI). Its free tier is ~600 units/month and a status
// lookup costs ~2, so every answer is cached in public.flight_cache and the upstream is
// only hit when the cache is stale AND the date is within a day of today (Austin time).
// The RapidAPI key lives in the RAPIDAPI_KEY secret and never reaches the browser.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const TTL_ACTIVE_MS = 12 * 60 * 1000;   // en route / pending flights
const TTL_FINAL_MS = 6 * 60 * 60 * 1000; // arrived / canceled — nothing changes any more
const TTL_MISS_MS = 45 * 60 * 1000;     // upstream had nothing for this flight+date

const supa = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  });
}

function todayAustin(): string {
  const p: Record<string, string> = {};
  new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date()).forEach((x) => (p[x.type] = x.value));
  return `${p.year}-${p.month}-${p.day}`;
}
function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000);
}
// AeroDataBox times look like "2026-09-03 15:04-05:00" (local) / "2026-09-03 20:04Z" (utc).
function iso(t?: { local?: string; utc?: string } | null) {
  return { local: t?.local ? t.local.replace(" ", "T") : null, utc: t?.utc ? t.utc.replace(" ", "T") : null };
}
function movement(m: any) {
  const sched = iso(m?.scheduledTime), est = iso(m?.revisedTime ?? m?.runwayTime ?? null);
  return {
    iata: m?.airport?.iata ?? null,
    name: m?.airport?.shortName ?? m?.airport?.name ?? null,
    sched: sched.local, schedUtc: sched.utc,
    est: est.local, estUtc: est.utc,
    terminal: m?.terminal ?? null,
    gate: m?.gate ?? null,
    belt: m?.baggageBelt ?? null,
    quality: m?.quality ?? [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json({ ok: false, reason: "method" }, 405);

  const url = new URL(req.url);
  const flight = (url.searchParams.get("flight") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const date = url.searchParams.get("date") ?? "";
  if (!/^[A-Z0-9]{2}\d{1,4}$/.test(flight) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ ok: false, reason: "bad-request" }, 400);
  }

  const key = `${flight}|${date}`;
  const { data: hit } = await supa.from("flight_cache").select("payload, fetched_at").eq("key", key).maybeSingle();
  if (hit) {
    const age = Date.now() - Date.parse(hit.fetched_at);
    const p = hit.payload as any;
    const ttl = !p?.ok ? TTL_MISS_MS : (p.status === "Arrived" || p.status === "Canceled") ? TTL_FINAL_MS : TTL_ACTIVE_MS;
    if (age < ttl) return json({ ...p, cached: true }, 200, { "X-Cache": "HIT" });
  }

  // Guard the quota: flight data only matters within a day of travel.
  const dd = Math.abs(dayDiff(date, todayAustin()));
  if (dd > 1) return json({ ok: false, reason: "out-of-window" });

  const rapidKey = Deno.env.get("RAPIDAPI_KEY");
  if (!rapidKey) return json({ ok: false, reason: "no-key" });

  let payload: any;
  try {
    const upstream = `https://aerodatabox.p.rapidapi.com/flights/number/${flight}/${date}?withAircraftImage=false&withLocation=false&dateLocalRole=Both`;
    const headers = { "x-rapidapi-key": rapidKey, "x-rapidapi-host": "aerodatabox.p.rapidapi.com" };
    let r = await fetch(upstream, { headers });
    if (r.status === 429) {
      // Basic plan allows 1 req/s; two travelers refreshing at once can collide. One spaced retry.
      await new Promise((res) => setTimeout(res, 1300));
      r = await fetch(upstream, { headers });
    }
    if (r.status === 204 || r.status === 404) {
      payload = { ok: false, reason: "not-found", flight, date };
    } else if (!r.ok) {
      // Don't cache upstream failures (rate limit, outage) — the page just stays in schedule mode.
      return json({ ok: false, reason: "upstream-" + r.status }, 502);
    } else {
      const flights: any[] = await r.json();
      // A number can map to several legs (connections); keep the one touching Austin.
      const leg = flights.find((f) => f?.arrival?.airport?.iata === "AUS" || f?.departure?.airport?.iata === "AUS") ?? flights[0];
      payload = leg
        ? {
          ok: true, flight, date,
          status: leg.status ?? "Unknown",
          number: leg.number ?? null,
          airline: leg.airline?.name ?? null,
          dep: movement(leg.departure),
          arr: movement(leg.arrival),
          updatedUtc: leg.lastUpdatedUtc ? String(leg.lastUpdatedUtc).replace(" ", "T") : null,
          source: "aerodatabox",
        }
        : { ok: false, reason: "not-found", flight, date };
    }
  } catch (e) {
    return json({ ok: false, reason: "upstream-error", detail: String(e) }, 502);
  }

  payload.fetchedAt = new Date().toISOString();
  await supa.from("flight_cache").upsert({ key, payload, fetched_at: payload.fetchedAt });
  return json(payload, 200, { "X-Cache": "MISS" });
});
