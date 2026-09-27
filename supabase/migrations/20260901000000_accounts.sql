-- CapWords accounts, progress mirror, and friend graph.
--
-- Run this once against the project (Dashboard -> SQL Editor -> New query ->
-- paste -> Run). It is written to be re-runnable: every object is created
-- with "if not exists" or dropped first, so a second run is a no-op rather
-- than an error.
--
-- Design notes:
--  * Photos and the sticker collection stay on the phone. Only the account,
--    the profile, and the numbers a pal is allowed to see live up here.
--  * Every table has RLS on with no permissive fallback. The publishable key
--    ships inside the app bundle, so RLS is the only thing standing between a
--    curious user and everyone else's rows.
--  * Nothing here trusts the client for identity: policies compare against
--    auth.uid(), never against a column the app sends.

-- ==================== profiles ====================
-- One row per auth user, created automatically by the trigger at the bottom.
-- The progress columns are a *mirror* of on-device state, not the source of
-- truth: the phone owns the numbers and pushes them up so pals can see them.

create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,

  -- Handle used for friend search. Always stored lowercase (see the
  -- normalise trigger) so lookups never need a case-insensitive scan.
  username        text not null unique
                  check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name    text not null default 'CapWords User'
                  check (char_length(display_name) between 1 and 40),

  target_language text not null default 'es',
  native_language text not null default 'en',
  daily_goal      integer not null default 5 check (daily_goal between 1 and 50),

  -- --- progress mirror ---
  current_streak  integer not null default 0 check (current_streak >= 0),
  longest_streak  integer not null default 0 check (longest_streak >= 0),
  total_words     integer not null default 0 check (total_words >= 0),
  words_today     integer not null default 0 check (words_today >= 0),
  -- Which day words_today counts. Read alongside it so a stale count from
  -- yesterday displays as 0 instead of as today's progress.
  words_on        date,

  coins           integer not null default 0 check (coins >= 0),
  pet_name        text not null default 'Biscuit',
  pet_species     text not null default 'cat',
  pet_outfit      text not null default 'none',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Prefix search on username ("sar" -> "sarah_c") for the Pals search box.
create index if not exists profiles_username_prefix_idx
  on public.profiles (username text_pattern_ops);

-- ==================== friendships ====================
-- A single row per relationship, holding both the request and the answer.
-- Direction is kept (who asked whom) because the UI shows incoming requests
-- differently from outgoing ones.

do $$ begin
  create type public.friendship_status as enum ('pending', 'accepted', 'declined');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester    uuid not null references public.profiles (id) on delete cascade,
  addressee    uuid not null references public.profiles (id) on delete cascade,
  status       public.friendship_status not null default 'pending',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,

  constraint friendship_not_self check (requester <> addressee)
);

-- One relationship per pair, whichever direction it was asked in. Without
-- this, two people who request each other at the same time end up with two
-- rows and the UI shows each of them a pending request forever.
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester, addressee), greatest(requester, addressee));

-- friendships_select_involved filters on `requester = uid or addressee = uid`,
-- so both columns need an index of their own — the pair index above is on
-- least()/greatest() expressions and cannot serve those lookups.
create index if not exists friendships_requester_idx on public.friendships (requester);
create index if not exists friendships_addressee_idx on public.friendships (addressee);

-- ==================== cheers ====================
-- Duolingo-style daily congrats. The unique key is what enforces "once per
-- pal per day" on the server, so a reinstall cannot farm the coin bonus.

create table if not exists public.cheers (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references public.profiles (id) on delete cascade,
  to_user    uuid not null references public.profiles (id) on delete cascade,
  cheered_on date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),

  constraint cheer_not_self check (from_user <> to_user),
  unique (from_user, to_user, cheered_on)
);

create index if not exists cheers_recipient_idx on public.cheers (to_user, cheered_on desc);

-- ==================== helpers ====================
-- SECURITY DEFINER so a policy can ask "is this person a friend of mine?"
-- without the caller needing read access to the row that answers it —
-- otherwise the profiles policy would recurse back through friendships' own
-- policy.
-- search_path is pinned on every definer function: without it, a caller can
-- put a lookalike schema in front of public and hijack the function body.

create or replace function public.is_my_friend(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  -- Takes one argument, not two, and fills in the caller from the JWT. A
  -- two-argument are_friends(a, b) would be an oracle: anyone holding two user
  -- ids could ask whether those strangers are friends. This can only ever
  -- answer questions about the person asking.
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester, f.addressee)    = least(other, (select auth.uid()))
      and greatest(f.requester, f.addressee) = greatest(other, (select auth.uid()))
  );
$$;

-- Today's count, but only if it was actually set today. Yesterday's leftover
-- reads as 0 rather than as progress the pal has not made yet.
create or replace function public.words_today_of(p public.profiles)
returns integer
language sql
stable
-- Pinned even though this is not SECURITY DEFINER: it is called from inside the
-- definer functions below, so it should not inherit a caller-controlled path.
set search_path = pg_catalog, pg_temp
as $$
  select case when p.words_on = (now() at time zone 'utc')::date then p.words_today else 0 end;
$$;

-- ==================== row level security ====================

alter table public.profiles    enable row level security;
alter table public.friendships enable row level security;
alter table public.cheers      enable row level security;

-- Deliberately NOT `force row level security`. Forcing it would apply these
-- policies to the table owner too, and the owner is exactly who runs
-- handle_new_user() when somebody signs up — at which point auth.uid() is not
-- set yet, so the insert policy would reject the row and every sign-up would
-- fail to get a profile. Adding `force` here looks like a hardening win and
-- is actually a breakage.

-- profiles: you can read yourself and your accepted pals. Everybody else is
-- reachable only through search_profiles(), which hands back a deliberately
-- narrow set of columns instead of the whole row.
drop policy if exists profiles_select_self_or_friend on public.profiles;
create policy profiles_select_self_or_friend on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_my_friend(id)));

-- The trigger creates the row, but an explicit insert policy keeps a client
-- able to self-heal if that row ever goes missing.
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No delete policy on purpose: an account goes away by deleting the auth
-- user, which cascades here. A client cannot orphan its own auth row.

-- friendships: only the two people involved ever see the row.
drop policy if exists friendships_select_involved on public.friendships;
create policy friendships_select_involved on public.friendships
  for select to authenticated
  using (requester = (select auth.uid()) or addressee = (select auth.uid()));

-- Requests go out through send_friend_request(); these policies are the
-- backstop that makes the direct table safe anyway.
drop policy if exists friendships_insert_as_requester on public.friendships;
create policy friendships_insert_as_requester on public.friendships
  for insert to authenticated
  with check (requester = (select auth.uid()) and status = 'pending');

drop policy if exists friendships_update_involved on public.friendships;
create policy friendships_update_involved on public.friendships
  for update to authenticated
  using (requester = (select auth.uid()) or addressee = (select auth.uid()))
  with check (requester = (select auth.uid()) or addressee = (select auth.uid()));

-- Either side can unfriend or withdraw.
drop policy if exists friendships_delete_involved on public.friendships;
create policy friendships_delete_involved on public.friendships
  for delete to authenticated
  using (requester = (select auth.uid()) or addressee = (select auth.uid()));

-- cheers: you see the ones you sent and the ones you got. You may only send
-- as yourself, and only to a pal.
drop policy if exists cheers_select_involved on public.cheers;
create policy cheers_select_involved on public.cheers
  for select to authenticated
  using (from_user = (select auth.uid()) or to_user = (select auth.uid()));

drop policy if exists cheers_insert_self on public.cheers;
create policy cheers_insert_self on public.cheers
  for insert to authenticated
  with check (
    from_user = (select auth.uid())
    and (select public.is_my_friend(to_user))
  );

-- ==================== triggers ====================

-- Usernames are compared and searched in lowercase, so normalise on the way
-- in rather than trusting every caller to remember.
create or replace function public.normalise_username()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  new.username   := lower(trim(new.username));
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_normalise on public.profiles;
create trigger profiles_normalise
  before insert or update on public.profiles
  for each row execute function public.normalise_username();

-- Turn whatever the identity provider gave us into a legal handle. Apple's
-- private relay addresses and Google's dotted names both survive this.
create or replace function public.suggest_username(seed text)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  base      text;
  candidate text;
  n         integer := 0;
begin
  base := lower(coalesce(split_part(seed, '@', 1), ''));
  base := regexp_replace(base, '[^a-z0-9_]', '', 'g');
  if char_length(base) < 3 then
    base := 'capper';
  end if;
  base := left(base, 14);

  candidate := base;
  -- Bounded so a pathological collision run can never hang a signup.
  while n < 50 and exists (select 1 from public.profiles p where p.username = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;

  if exists (select 1 from public.profiles p where p.username = candidate) then
    candidate := base || floor(random() * 1000000)::text;
  end if;

  return left(candidate, 20);
end;
$$;

-- Every auth user gets a profile the moment they sign up, whether that was
-- email, Apple, or anything enabled later. Doing it in a trigger means the
-- app never has a signed-in user with no row to read.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  seed  text;
  shown text;
begin
  seed := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.email, ''),
    'capper'
  );

  shown := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    'CapWords User'
  );

  insert into public.profiles (id, username, display_name)
  values (new.id, public.suggest_username(seed), left(shown, 40))
  on conflict (id) do nothing;

  return new;
exception
  -- A profile we failed to create is recoverable (the app self-heals on next
  -- launch); a signup that hard-fails is not. Never block the sign-up.
  when others then
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==================== the API the app calls ====================
-- Everything below is SECURITY DEFINER, which means it runs with the table
-- owner's rights and RLS does not apply inside it. That is the point: search
-- has to look at strangers' rows. Each one therefore re-checks auth.uid()
-- itself and returns only columns a pal is allowed to see.

-- Search by handle prefix or display name. Returns the caller's relationship
-- to each hit so the Pals screen can label the button (Add / Pending / Pal).
create or replace function public.search_profiles(q text)
returns table (
  id             uuid,
  username       text,
  display_name   text,
  pet_name       text,
  pet_species    text,
  pet_outfit     text,
  current_streak integer,
  words_today    integer,
  status         text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.pet_name,
    p.pet_species,
    p.pet_outfit,
    p.current_streak,
    public.words_today_of(p),
    case
      when f.id is null            then 'none'
      when f.status = 'accepted'   then 'friends'
      when f.status = 'declined'   then 'none'
      when f.requester = auth.uid() then 'pending_out'
      else 'pending_in'
    end
  from public.profiles p
  left join public.friendships f
    on least(f.requester, f.addressee)    = least(p.id, auth.uid())
   and greatest(f.requester, f.addressee) = greatest(p.id, auth.uid())
  where auth.uid() is not null
    and p.id <> auth.uid()
    and char_length(trim(q)) >= 2
    and (
      p.username like lower(trim(q)) || '%'
      or p.display_name ilike '%' || trim(q) || '%'
    )
  order by (p.username = lower(trim(q))) desc, p.current_streak desc
  limit 20;
$$;

-- Every pal and every outstanding request in one round trip, which is all the
-- Pals screen needs to render both of its sections.
create or replace function public.list_friends()
returns table (
  friendship_id  uuid,
  id             uuid,
  username       text,
  display_name   text,
  pet_name       text,
  pet_species    text,
  pet_outfit     text,
  current_streak integer,
  longest_streak integer,
  words_today    integer,
  total_words    integer,
  status         text,
  cheered_today  boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    f.id,
    p.id,
    p.username,
    p.display_name,
    p.pet_name,
    p.pet_species,
    p.pet_outfit,
    p.current_streak,
    p.longest_streak,
    public.words_today_of(p),
    p.total_words,
    case
      when f.status = 'accepted'    then 'friends'
      when f.requester = auth.uid() then 'pending_out'
      else 'pending_in'
    end,
    exists (
      select 1 from public.cheers c
      where c.from_user = auth.uid()
        and c.to_user = p.id
        and c.cheered_on = (now() at time zone 'utc')::date
    )
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where auth.uid() is not null
    and f.status <> 'declined'
    and (f.requester = auth.uid() or f.addressee = auth.uid())
  order by (f.status = 'accepted'), p.current_streak desc;
$$;

-- Ask to be pals. Idempotent, and it auto-accepts when the other person has
-- already asked you — two people tapping Add at the same time should end up
-- friends, not stuck in a pair of pending requests.
create or replace function public.send_friend_request(target_username text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me       uuid := auth.uid();
  target   uuid;
  existing public.friendships%rowtype;
begin
  if me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select p.id into target from public.profiles p
  where p.username = lower(trim(target_username));

  if target is null then
    return 'no_such_user';
  end if;
  if target = me then
    return 'self';
  end if;

  select * into existing from public.friendships f
  where least(f.requester, f.addressee)    = least(me, target)
    and greatest(f.requester, f.addressee) = greatest(me, target);

  if found then
    if existing.status = 'accepted' then
      return 'friends';
    end if;
    -- They asked first (or asked and were declined): accepting is the kind
    -- reading of both people tapping Add.
    if existing.addressee = me then
      update public.friendships
        set status = 'accepted', responded_at = now()
        where id = existing.id;
      return 'friends';
    end if;
    if existing.status = 'declined' then
      update public.friendships
        set status = 'pending', created_at = now(), responded_at = null
        where id = existing.id;
      return 'pending_out';
    end if;
    return 'pending_out';
  end if;

  insert into public.friendships (requester, addressee) values (me, target);
  return 'pending_out';
end;
$$;

-- Answer an incoming request. Only the addressee may.
create or replace function public.respond_friend_request(friendship uuid, accept boolean)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  n  integer;
begin
  update public.friendships
    set status = case when accept then 'accepted'::public.friendship_status
                      else 'declined'::public.friendship_status end,
        responded_at = now()
    where id = friendship
      and addressee = me
      and status = 'pending';

  get diagnostics n = row_count;
  if n = 0 then
    return 'not_found';
  end if;
  return case when accept then 'friends' else 'declined' end;
end;
$$;

-- Cheer a pal. Returns true only the first time today, so the caller knows
-- whether to award the coin. The unique index is what actually enforces it.
create or replace function public.cheer_friend(target uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
  n  integer;
begin
  if me is null or not public.is_my_friend(target) then
    return false;
  end if;

  insert into public.cheers (from_user, to_user)
  values (me, target)
  on conflict (from_user, to_user, cheered_on) do nothing;

  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- Stop being pals, or withdraw a request you sent.
create or replace function public.unfriend(other uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.friendships f
  where auth.uid() is not null
    and least(f.requester, f.addressee)    = least(auth.uid(), other)
    and greatest(f.requester, f.addressee) = greatest(auth.uid(), other);
$$;

-- ==================== table privileges ====================
-- RLS decides which *rows* you can see. A plain SQL GRANT decides whether the
-- table is reachable through the Data API at all, and the two are completely
-- separate. New tables are not always exposed automatically - it depends on
-- the project's Data API settings - so the grants are spelled out here rather
-- than left to a default that may not be there.
--
-- Granted to `authenticated` only, and exactly as far as the policies above
-- allow: nothing may delete a profile (accounts go away by deleting the auth
-- user, which cascades), and a cheer is written once and never edited.

grant usage on schema public to authenticated;

grant select, insert, update         on public.profiles    to authenticated;
grant select, insert, update, delete on public.friendships to authenticated;
grant select, insert                 on public.cheers      to authenticated;

-- `anon` is every copy of the app before anybody signs in. Every policy above
-- is `to authenticated`, so anon would see nothing regardless — but the table
-- should be out of reach, not merely empty.
revoke all on public.profiles, public.friendships, public.cheers from anon;

-- handle_new_user is a trigger body, never an RPC. PostgREST still exposes any
-- callable public function at /rest/v1/rpc/<name>, so revoke execute outright:
-- the trigger fires as the table owner and does not need this grant.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Signed-in users only. The publishable key can reach `anon`, so leaving
-- execute open to it would hand the whole search index to anyone.
revoke all on function
  public.search_profiles(text),
  public.list_friends(),
  public.send_friend_request(text),
  public.respond_friend_request(uuid, boolean),
  public.cheer_friend(uuid),
  public.unfriend(uuid),
  public.is_my_friend(uuid),
  public.suggest_username(text)
from public, anon;

grant execute on function
  public.search_profiles(text),
  public.list_friends(),
  public.send_friend_request(text),
  public.respond_friend_request(uuid, boolean),
  public.cheer_friend(uuid),
  public.unfriend(uuid),
  -- is_my_friend is not called by the app, but it *is* called from inside the
  -- profiles and cheers policies, and a policy is evaluated as whoever is
  -- asking. Without this grant every read of a pal's profile fails with
  -- "permission denied for function is_my_friend".
  public.is_my_friend(uuid)
to authenticated;

-- suggest_username stays revoked: only handle_new_user calls it, and that
-- runs as the owner.
