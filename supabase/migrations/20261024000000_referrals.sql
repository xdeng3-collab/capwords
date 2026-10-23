-- Invite a pal: when someone new signs up with your code, you both get
-- 7 days of Pro.
--
-- The reward is ours to give, not Apple's: it never touches StoreKit. The app
-- reads the end date from referral_status() and lifts the daily limit until
-- then (subscriptionService.canLearnWord).
--
-- What counts as "someone new": an account made in the last 7 days, on a
-- phone that has never been signed in to any other Voyaword account. The
-- phone is recognised by a random marker the app keeps in the keychain (it
-- survives a reinstall); only a SHA-256 of it is stored here.
--
-- Everything lives in the `private` schema, which PostgREST does not expose.
-- The app reaches it only through the two SECURITY DEFINER functions at the
-- bottom, and each of them reads the caller from auth.uid().
--
-- The numbers below are mirrored in src/config/referral.js for the copy on
-- screen. Change both together.
--   reward per sign-up      7 days (each side)
--   most Pro banked ahead   90 days
--   window to enter a code  7 days after making the account
--
-- Re-runnable.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ==================== tables ====================

-- One code per person, made the first time they look at it.
create table if not exists private.invite_codes (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  -- No 0/O or 1/I, so a code read aloud or off a screenshot types correctly.
  code       text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);

-- One row per successful invite. An invitee can only ever be invited once.
-- If the invitee later deletes their account the row stays (invitee goes
-- null) so the inviter keeps the days they were given.
create table if not exists private.referrals (
  id         bigint generated always as identity primary key,
  invitee    uuid unique references auth.users (id) on delete set null,
  inviter    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint referral_not_self check (invitee is distinct from inviter)
);
create index if not exists referrals_inviter_idx on private.referrals (inviter, created_at);

-- Which phones have been signed in to which accounts. Kept (user goes null)
-- when an account is deleted, so deleting and re-making an account on the
-- same phone does not earn a second invite.
create table if not exists private.account_devices (
  id          bigint generated always as identity primary key,
  device_hash text not null,
  user_id     uuid references auth.users (id) on delete set null,
  first_seen  timestamptz not null default now(),
  unique (device_hash, user_id)
);
create index if not exists account_devices_user_idx on private.account_devices (user_id);

alter table private.invite_codes    enable row level security;
alter table private.referrals       enable row level security;
alter table private.account_devices enable row level security;
revoke all on private.invite_codes, private.referrals, private.account_devices
  from public, anon, authenticated;

-- ==================== helpers (not callable by the app) ====================

-- The stored form of the app's device marker, or null for a missing or
-- malformed one. Salted with a fixed prefix so the hash means nothing outside
-- this table.
create or replace function private.device_hash(p_device text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_device is null or char_length(p_device) not between 16 and 128 then null
    else encode(pg_catalog.sha256(convert_to('voyaword-device:' || p_device, 'UTF8')), 'hex')
  end;
$$;

-- Remember that this account was signed in on this phone.
create or replace function private.note_device(p_user uuid, p_hash text)
returns void
language sql
set search_path = ''
as $$
  insert into private.account_devices (device_hash, user_id)
  select p_hash, p_user
  where p_hash is not null
  on conflict (device_hash, user_id) do nothing;
$$;

-- The caller's code, made on first use. Six characters from a 32-letter
-- alphabet is a billion codes, so a collision is rare; the loop just retries.
create or replace function private.ensure_invite_code(p_user uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  existing  text;
  candidate text;
  tries     integer := 0;
begin
  select c.code into existing from private.invite_codes c where c.user_id = p_user;
  if existing is not null then
    return existing;
  end if;

  loop
    tries := tries + 1;
    candidate := '';
    for i in 1 .. 6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * 32)::integer, 1);
    end loop;

    begin
      insert into private.invite_codes (user_id, code) values (p_user, candidate);
      return candidate;
    exception when unique_violation then
      -- Either the code is taken (try another) or a parallel call already
      -- made this person's code (use it).
      select c.code into existing from private.invite_codes c where c.user_id = p_user;
      if existing is not null then
        return existing;
      end if;
      if tries >= 20 then
        raise;
      end if;
    end;
  end loop;
end;
$$;

-- When the caller's invite Pro runs out, or null if they never had any.
--
-- Every reward (joining with a code, and each pal who joined with yours) adds
-- 7 days from whichever is later: now-at-the-time or the end already banked.
-- The bank never reaches more than 90 days past the reward that filled it, so
-- inviting a whole class gives a long run of Pro, not a lifetime of it.
create or replace function private.referral_pro_until(p_user uuid)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  reward constant interval := interval '7 days';
  cap    constant interval := interval '90 days';
  until  timestamptz := null;
  t      timestamptz;
begin
  for t in
    select r.created_at from private.referrals r
    where r.invitee = p_user or r.inviter = p_user
    order by r.created_at
  loop
    until := least(greatest(coalesce(until, t), t) + reward, t + cap);
  end loop;
  return until;
end;
$$;

-- ==================== the API the app calls ====================

-- Everything the Invite screen needs, in one call. Also notes this phone
-- against the account, which is what later stops a second account made on
-- the same phone from counting as a new pal.
create or replace function public.referral_status(p_device text default null)
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

-- Join with a pal's code. Returns { status, inviterName?, proUntil? } where
-- status is one of:
--   ok, bad_code, self, already_invited, too_late, device_used, no_device
-- Only 'ok' changes anything. On 'ok' the two of you also become pals.
create or replace function public.redeem_invite(p_code text, p_device text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me        uuid := auth.uid();
  clean     text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  hash      text := private.device_hash(p_device);
  inviter   uuid;
  joined_at timestamptz;
  n         integer;
begin
  if me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select c.user_id into inviter from private.invite_codes c where c.code = clean;
  if inviter is null then
    return jsonb_build_object('status', 'bad_code');
  end if;
  if inviter = me then
    return jsonb_build_object('status', 'self');
  end if;
  if exists (select 1 from private.referrals r where r.invitee = me) then
    return jsonb_build_object('status', 'already_invited');
  end if;

  select u.created_at into joined_at from auth.users u where u.id = me;
  if joined_at is null or joined_at <= now() - interval '7 days' then
    return jsonb_build_object('status', 'too_late');
  end if;

  if hash is null then
    return jsonb_build_object('status', 'no_device');
  end if;
  -- Any other account on this phone - the inviter's, an older one of the
  -- invitee's, or one since deleted - means this is not a new pal.
  if exists (
    select 1 from private.account_devices d
    where d.device_hash = hash and d.user_id is distinct from me
  ) then
    return jsonb_build_object('status', 'device_used');
  end if;

  perform private.note_device(me, hash);

  insert into private.referrals (invitee, inviter) values (me, inviter)
  on conflict (invitee) do nothing;
  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('status', 'already_invited');
  end if;

  -- Joining through a pal makes you pals. A missing profile row must not undo
  -- the reward, so this is best effort.
  begin
    insert into public.friendships (requester, addressee, status, responded_at)
    values (inviter, me, 'accepted', now())
    on conflict ((least(requester, addressee)), (greatest(requester, addressee)))
    do update set status = 'accepted', responded_at = now();
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'status',      'ok',
    'inviterName', (select p.display_name from public.profiles p where p.id = inviter),
    'proUntil',    private.referral_pro_until(me)
  );
end;
$$;

-- ==================== privileges ====================

revoke all on function
  private.device_hash(text),
  private.note_device(uuid, text),
  private.ensure_invite_code(uuid),
  private.referral_pro_until(uuid)
from public, anon, authenticated;

revoke all on function
  public.referral_status(text),
  public.redeem_invite(text, text)
from public, anon;

grant execute on function
  public.referral_status(text),
  public.redeem_invite(text, text)
to authenticated;
