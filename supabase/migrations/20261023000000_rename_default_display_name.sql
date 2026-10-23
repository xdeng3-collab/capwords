-- The app is now called Voyaword, so the name a profile has until its owner
-- picks one changes from 'CapWords User' to 'Voyaword User'. Pals see this
-- name, so existing placeholder rows move over too. The app treats both as
-- "no name yet" (PLACEHOLDER_DISPLAY_NAMES in src/config/copy.js).
--
-- Re-runnable, like the first migration.

alter table public.profiles
  alter column display_name set default 'Voyaword User';

update public.profiles
  set display_name = 'Voyaword User'
  where display_name = 'CapWords User';

-- Same as in 20260901000000_accounts.sql except for the fallback name.
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
    'Voyaword User'
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
