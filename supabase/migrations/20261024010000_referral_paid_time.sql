-- Invite days wait while someone is paying.
--
-- Before this, invite Pro ran from the moment it was earned, so for a paying
-- member it was used up underneath a plan that already had no limit - the
-- reward was worth nothing to them. Now the app tells the server the dates of
-- the current App Store period (from StoreKit: the transaction's purchase date
-- and expiry), and those stretches of time do not count against invite days.
-- A paying member's invite days therefore start when the paid period ends:
-- effectively a longer membership. Each renewal reports the next period, so
-- the days keep moving back for as long as they keep paying.
--
-- The dates are the app's word. That is fine here: claiming to be paid only
-- *pauses* invite days, it never adds any, and the daily limit itself is
-- enforced on the phone anyway.
--
-- Replaces referral_pro_until() and referral_status() from
-- 20261024000000_referrals.sql. Re-runnable.

create table if not exists private.paid_periods (
  user_id    uuid not null references auth.users (id) on delete cascade,
  paid_from  timestamptz not null,
  paid_until timestamptz not null,
  primary key (user_id, paid_from),
  constraint paid_period_forward check (paid_until > paid_from)
);
alter table private.paid_periods enable row level security;
revoke all on private.paid_periods from public, anon, authenticated;

-- Remember a reported period. The same period reported again (or extended,
-- as an upgrade does) updates in place. Anything implausible - backwards, or
-- reaching more than ~13 months either side of now - is ignored, so a broken
-- clock cannot freeze invite days for years.
create or replace function private.note_paid_period(p_user uuid, p_from timestamptz, p_until timestamptz)
returns void
language sql
set search_path = ''
as $$
  insert into private.paid_periods (user_id, paid_from, paid_until)
  select p_user, p_from, p_until
  where p_from is not null
    and p_until is not null
    and p_until > p_from
    and p_from > now() - interval '400 days'
    and p_until < now() + interval '400 days'
  on conflict (user_id, paid_from)
  do update set paid_until = greatest(private.paid_periods.paid_until, excluded.paid_until);
$$;

-- When the caller's invite Pro runs out, or null if they never had any.
--
-- Walks forward through every reward (joining with a code, and each pal who
-- joined with yours). Each one adds 7 days to a bank, which never holds more
-- than 90. Between rewards the bank drains, but only during time that was not
-- inside a paid period. What is left after the last reward is laid out from
-- then on, again skipping paid time - so a paying member's days land after
-- the current period ends.
--
-- Works in seconds rather than intervals: subtracting two timestamps gives a
-- mixed days-and-hours interval whose arithmetic depends on the session time
-- zone, and none of that is wanted here.
create or replace function private.referral_pro_until(p_user uuid)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  reward constant double precision := 7 * 86400;
  cap    constant double precision := 90 * 86400;
  ps     double precision[] := '{}';  -- merged paid periods, as epochs
  pe     double precision[] := '{}';
  n      integer;
  r      record;
  bank   double precision := 0;
  c      double precision := null;    -- time of the last reward
  t      double precision;
  free_s double precision;
  x      double precision;
  gap    double precision;
begin
  -- Merge overlapping periods so paid time is never counted twice.
  for r in
    select extract(epoch from p.paid_from) as f, extract(epoch from p.paid_until) as u
    from private.paid_periods p
    where p.user_id = p_user
    order by p.paid_from
  loop
    n := coalesce(array_length(ps, 1), 0);
    if n > 0 and r.f <= pe[n] then
      pe[n] := greatest(pe[n], r.u);
    else
      ps := ps || r.f;
      pe := pe || r.u;
    end if;
  end loop;
  n := coalesce(array_length(ps, 1), 0);

  for t in
    select extract(epoch from rf.created_at) from private.referrals rf
    where rf.invitee = p_user or rf.inviter = p_user
    order by rf.created_at
  loop
    if c is not null then
      -- Free (unpaid) seconds between the last reward and this one.
      free_s := t - c;
      for i in 1 .. n loop
        free_s := free_s - greatest(0, least(pe[i], t) - greatest(ps[i], c));
      end loop;
      bank := greatest(0, bank - free_s);
    end if;
    bank := least(bank + reward, cap);
    c := t;
  end loop;

  if c is null then
    return null;
  end if;

  -- Spend what is left from the last reward onwards, stepping over paid time.
  x := c;
  for i in 1 .. n loop
    continue when pe[i] <= x;
    if ps[i] > x then
      gap := ps[i] - x;
      if gap >= bank then
        return to_timestamp(x + bank);
      end if;
      bank := bank - gap;
    end if;
    x := greatest(x, pe[i]);
  end loop;
  return to_timestamp(x + bank);
end;
$$;

-- Same as before, plus the current paid period when there is one. The old
-- one-argument version has to go: with defaults on both, a call with one
-- argument would match either and Postgres would refuse it as ambiguous.
drop function if exists public.referral_status(text);

create or replace function public.referral_status(
  p_device     text default null,
  p_paid_from  timestamptz default null,
  p_paid_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me        uuid := auth.uid();
  joined_at timestamptz;
  inviter   uuid;
  inviter_name text;
begin
  if me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  perform private.note_device(me, private.device_hash(p_device));
  perform private.note_paid_period(me, p_paid_from, p_paid_until);

  select u.created_at into joined_at from auth.users u where u.id = me;
  select r.inviter into inviter from private.referrals r where r.invitee = me;
  if inviter is not null then
    select p.display_name into inviter_name from public.profiles p where p.id = inviter;
  end if;

  return jsonb_build_object(
    'code',        private.ensure_invite_code(me),
    'invited',     inviter is not null,
    'invitedBy',   inviter_name,
    'canRedeem',   inviter is null and joined_at > now() - interval '7 days',
    'palsJoined',  (select count(*) from private.referrals r where r.inviter = me),
    'proUntil',    private.referral_pro_until(me)
  );
end;
$$;

revoke all on function
  private.note_paid_period(uuid, timestamptz, timestamptz),
  private.referral_pro_until(uuid)
from public, anon, authenticated;

revoke all on function public.referral_status(text, timestamptz, timestamptz) from public, anon;
grant execute on function public.referral_status(text, timestamptz, timestamptz) to authenticated;
