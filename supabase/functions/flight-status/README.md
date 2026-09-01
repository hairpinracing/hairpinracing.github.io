# flight-status Edge Function

Live flight status for the Austin 2026 trip page (`austin-2026/index.html`).
The page works without it (it shows scheduled times and a FlightAware link);
deploying it upgrades every tracked leg to live status, gates and delays.

## One-time setup (~5 minutes)

1. **Get an AeroDataBox key** (free tier is enough for one trip):
   sign in at https://rapidapi.com → subscribe to *AeroDataBox* → **Basic (free)**
   → copy your `X-RapidAPI-Key`.

2. **Create the cache table** — paste `supabase/migrations/20260901000000_flight_cache.sql`
   into the Supabase SQL editor for project `pwnvcubqwlhbkaijaiws` and run it.
   The last line prints `flight_cache ready`.

3. **Deploy** from the repo root:

   ```bash
   supabase login
   supabase link --project-ref pwnvcubqwlhbkaijaiws
   supabase secrets set RAPIDAPI_KEY=<your-key>
   supabase functions deploy flight-status --no-verify-jwt
   ```

4. **Check it**:

   ```bash
   curl "https://pwnvcubqwlhbkaijaiws.supabase.co/functions/v1/flight-status?flight=AS540&date=2026-09-03" \
     -H "apikey: sb_publishable_27WhoWhNx_Fk1w9CeD4AWg__gRLg1ib"
   ```

   `{"ok":true,"status":...}` means live. `"reason":"out-of-window"` is normal more
   than a day before the flight; `"reason":"no-key"` means step 3's secret is missing.

## Quota

AeroDataBox Basic ≈ 600 units/month; a status lookup ≈ 2 units. The function caches
each flight+date for 12 min (6 h once landed/canceled) and refuses to call upstream
outside ±1 day of the flight, so the whole trip stays well under the cap.
