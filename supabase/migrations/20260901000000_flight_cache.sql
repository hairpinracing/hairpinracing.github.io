-- Cache for the flight-status Edge Function (Austin 2026 trip page).
-- Only the function touches this table (service role); no anon policies on purpose,
-- so the browser can't read raw upstream data or trigger extra API calls.

create table if not exists public.flight_cache (
  key        text primary key,                      -- "AS540|2026-09-03"
  payload    jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.flight_cache enable row level security;

comment on table public.flight_cache is
  'Per flight+date status cached by the flight-status edge function (AeroDataBox). No client access.';

-- verify
select 'flight_cache ready' as status, count(*) as rows from public.flight_cache;
