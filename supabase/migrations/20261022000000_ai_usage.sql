-- Rate-limit counters for the ai-proxy Edge Function.
--
-- DeepSeek is a paid upstream, and the proxy accepts callers who are not
-- signed in (accounts are optional; recognising a photo is not). Without a
-- ceiling that survives across Edge Function instances, one loop could spend
-- the whole API budget. This table is that ceiling.
--
-- What is stored: an opaque bucket name (an HMAC of "user:<id>",
-- "device:<install id>" or "ip:<address>", computed in the function - never
-- the raw value), the start of a fixed window, and a hit count. No photos, no
-- prompts, no answers. Rows older than two days are deleted on the next call.
--
-- Nothing here is reachable through the Data API: the table lives in a schema
-- PostgREST does not expose, and the one function that touches it is callable
-- by service_role only (the Edge Function's admin client).
--
-- Re-runnable.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.ai_usage (
  bucket       text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (bucket, window_start)
);
create index if not exists ai_usage_window_start_idx on private.ai_usage (window_start);
alter table private.ai_usage enable row level security;
revoke all on private.ai_usage from public, anon, authenticated;

-- Take one hit from every bucket, or from none.
--
-- p_buckets[i] is limited to p_limits[i] hits per fixed window of
-- p_windows[i] seconds. Returns NULL when the request is allowed (and counts
-- it against every bucket), or the first bucket that is full (and counts
-- nothing) - so a caller who is turned away by their own limit does not also
-- eat into the project-wide one.
--
-- Rows are locked in the order given. Pass the shared project-wide bucket
-- LAST, so two callers can never hold each other's locks in opposite order.
create or replace function public.ai_usage_take(
  p_buckets text[],
  p_windows integer[],
  p_limits  integer[]
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  n       integer := coalesce(array_length(p_buckets, 1), 0);
  starts  timestamptz[] := '{}';
  v_start timestamptz;
  v_hits  integer;
begin
  if n = 0
     or coalesce(array_length(p_windows, 1), 0) <> n
     or coalesce(array_length(p_limits, 1), 0) <> n then
    raise exception 'ai_usage_take: buckets, windows and limits must be the same non-zero length';
  end if;

  for i in 1 .. n loop
    v_start := to_timestamp(floor(extract(epoch from now()) / p_windows[i]) * p_windows[i]);
    starts := starts || v_start;

    insert into private.ai_usage (bucket, window_start, hits)
    values (p_buckets[i], v_start, 0)
    on conflict (bucket, window_start) do nothing;

    select hits into v_hits
    from private.ai_usage
    where bucket = p_buckets[i] and window_start = v_start
    for update;

    if v_hits >= p_limits[i] then
      return p_buckets[i];
    end if;
  end loop;

  for i in 1 .. n loop
    update private.ai_usage
    set hits = hits + 1
    where bucket = p_buckets[i] and window_start = starts[i];
  end loop;

  delete from private.ai_usage where window_start < now() - interval '2 days';

  return null;
end;
$$;

revoke all on function public.ai_usage_take(text[], integer[], integer[]) from public, anon, authenticated;
grant execute on function public.ai_usage_take(text[], integer[], integer[]) to service_role;
