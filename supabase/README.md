# CapWords accounts

Supabase holds three things and nothing else:

- **the account** — email + password today, Apple later
- **a mirror of the numbers** pals are allowed to see (streak, words today,
  total words, coins, the buddy's name and outfit)
- **the friend graph** — requests, pals, and daily cheers

Everything a person actually *makes* — the words, the photos, the collection —
stays on the phone. Signing out no longer erases it; that is now a separate,
clearly-labelled "Erase everything on this phone" button.

## Status (2026-09-28)

Against project `bxwifjkinhtxxcelasqe`, already done via the Supabase MCP server:

- **Migration applied** — `profiles`, `friendships`, `cheers` exist with RLS on;
  all triggers, RPCs, and grants are in place. A follow-up migration
  (`accounts_harden_definer_functions`) pins `search_path` on the two remaining
  helpers and revokes RPC access to the `handle_new_user` trigger body.
- **`delete-account` deployed** — version 1, `verify_jwt` on.
- **Verified end to end** — signup trigger mints a profile; search / request /
  accept / cheer (with once-per-day dedup) / unfriend all work; RLS keeps a
  non-friend from reading another profile row; deleting the auth user cascades
  the profile, friendships, and cheers away.
- **Friendship updates locked down (2026-09-28)** —
  `migrations/20260927000000_lock_friendship_updates.sql` was run by hand in
  the SQL editor, so it is not in `supabase_migrations` (a later `db push`
  re-runs it harmlessly). Verified: no UPDATE policy on `friendships`, and
  `authenticated` has no UPDATE privilege on it.

Security advisors are clean apart from:
- the expected `SECURITY DEFINER`-callable notes on the friend-graph RPCs, which
  are the app's API by design;
- `rls_auto_enable()`, Supabase's own event-trigger function for auto-enabling
  RLS. Postgres refuses to call an event-trigger function directly, so the RPC
  endpoint it flags cannot run it;
- **leaked password protection is off.** Turn it on under Authentication ->
  Password security before launch.

Still to do by hand in the dashboard (no API for these):

- Add `capwords://auth-callback` **and** `capwords://reset-password` under
  **Authentication → URL Configuration → Redirect URLs**, and set **Site URL**
  to `capwords://`. Without these the links in Supabase's emails fall back to
  the Site URL — `http://localhost:3000` on a fresh project — which is a dead
  end on a phone, and is why a confirmation email looks broken.
- Decide **Confirm email** on/off (see section 3) and set up real SMTP before
  launch.

The rest of this file is the from-scratch setup, kept for the next environment.

## 1. Run the migration (required, once)

Nothing works until this runs. Two ways, both fine.

**With the CLI** (the CLI is a devDependency, so `npx supabase` just works):

```
npx supabase login
npx supabase link --project-ref bxwifjkinhtxxcelasqe
npx supabase db push
```

`login` opens a browser to authorise. `link` asks for the database password —
the one in the `postgresql://postgres:[YOUR-PASSWORD]@db...` string, which is
under Settings → Database, and is *not* the same as any of the API keys. Both
prompts read the value directly from you; neither needs to be written down
anywhere.

**Or by hand**, if you would rather not deal with the password: paste each
file in `migrations/` into the SQL editor and run them in filename order
(`20260901000000_accounts.sql`, then `20260927000000_lock_friendship_updates.sql`).

https://supabase.com/dashboard/project/bxwifjkinhtxxcelasqe/sql/new

They are written to be re-runnable, so running one twice is harmless.

Check it took by confirming three tables exist under Table Editor:
`profiles`, `friendships`, `cheers`. Then run Supabase's own linter over the
result, which catches exposed tables and missing RLS:

```
npx supabase db advisors --type security
```

### Letting an agent run migrations for you

`.mcp.json` in the repo root points Claude Code at Supabase's hosted MCP
server, scoped to this project with the `database` and `docs` tool groups. It
authenticates over OAuth in the browser — no password or token gets typed into
a chat. Authenticate once from an interactive terminal:

```
claude /mcp
```

Pick `supabase`, then Authenticate. After that an agent can apply migrations
and query the database directly. Worth knowing before you turn it on: this
gives an LLM write access to your database, so Supabase's own
[security notes](https://supabase.com/docs/guides/getting-started/mcp) are
worth a read. Adding `&read_only=true` to the URL in `.mcp.json` limits it to
reads, at the cost of not being able to run migrations.

`.claude/skills/` holds Supabase's official agent skills
([supabase/agent-skills](https://github.com/supabase/agent-skills)) — reference
docs only, no scripts. They are what flagged the missing table grants and the
one-argument `is_my_friend` pattern in this migration.

### A note on keys

Three different secrets get confused with each other here:

| Key | Looks like | Where it belongs |
| --- | --- | --- |
| Publishable | `sb_publishable_...` | In the app bundle. Safe to ship — that is its job. |
| Secret | `sb_secret_...` | Server-side only. **Never** in `.env` behind an `EXPO_PUBLIC_` prefix, or it ships to every phone. It bypasses RLS entirely. |
| Database password | — | Only ever typed into a `supabase link` prompt. |
| Personal access token | `sbp_...` | Only for the Management API. The secret key does *not* work there. |

None of the last three appear anywhere in this repo, and none of them should.

## 2. Deploy the account-deletion function

Deleting an account removes a row from `auth.users`, which needs the service
role — so it runs as an Edge Function, where the secret key stays on
Supabase's side instead of shipping to a phone. It takes no arguments: the
user id comes from the verified JWT, so there is nothing a caller could
tamper with to delete somebody else.

```
npx supabase functions deploy delete-account
```

Until it is deployed, the "Delete my account" row in Profile shows an error
rather than doing anything. Everything else works without it.

## 3. Email confirmation (decide, once)

The project currently has **Confirm email on**. That means signing up sends a
link and hands back no session, so the app shows a "check your inbox" panel
and the person has to come back and log in. That is correct behaviour, but two
things are worth knowing:

- Supabase's built-in SMTP is rate limited to a few messages an hour. It is
  fine for you testing, not for real users — set up your own SMTP under
  Authentication → Emails before launch.
- To skip confirmation entirely while developing, turn off
  Authentication → Sign In / Providers → Email → "Confirm email". Sign-ups
  then return a session immediately and the app goes straight in. The code
  handles both without changes.

Both email links come back into the app rather than into a browser:
sign-up confirmation redirects to `capwords://auth-callback` and password reset
to `capwords://reset-password`. `App.js` catches either URL — on a cold start
from Mail as well as a warm one — and `completeAuthFromUrl()` turns it into a
session, so tapping the link is enough on its own; the "check your inbox" panel
notices and lets the person straight in.

Both URLs must be listed under Authentication → URL Configuration → Redirect
URLs, or Supabase refuses the redirect and quietly sends people to the Site URL
instead.

## 4. Sign in with Apple (blocked on a paid Apple account)

The code is written and wired; it is switched off because it cannot work yet.

`A59BMF9Y7J` is a free personal team, and "Sign in with Apple" is a capability
only the paid Apple Developer Program grants. Worse than the button failing:
the entitlement makes code signing fail on a device, so the whole build
breaks. That is why this is an explicit flag rather than a runtime
check — `AppleAuthentication.isAvailableAsync()` reports on the phone, not on
whether this build is entitled, so it would say yes and then fail.

Leaving `expo-apple-authentication` out of `plugins` is not enough: Expo
applies that package's config plugin whenever it is installed, and the plugin
adds the entitlement. `plugins/withoutAppleSignInEntitlement.js` strips it
again unless `EXPO_PUBLIC_APPLE_SIGN_IN=true`.

Once the membership is paid, two steps turn it on:

1. Supabase → Authentication → Sign In / Providers → **Apple** → enable, and
   put `com.capwordsxxx.app` in **Client IDs**. Native sign-in verifies the
   token against the bundle id; no secret key or Services ID is needed for the
   iOS app on its own.
2. `.env` → `EXPO_PUBLIC_APPLE_SIGN_IN=true`, then
   `npx expo prebuild --clean`. The one flag both keeps the entitlement in the
   build and shows the button.

The Apple button then appears on the auth screen on its own.

## How the pieces fit

| File | Does |
| --- | --- |
| `migrations/20260901000000_accounts.sql` | Tables, RLS, triggers, and the RPCs the app calls |
| `migrations/20260927000000_lock_friendship_updates.sql` | Friendship status changes only through the RPCs |
| `src/api/supabaseClient.js` | The client, session storage, error copy |
| `src/services/accountService.js` | Sign up / in / out, profile, progress push |
| `src/services/friendService.js` | Search, requests, cheers |
| `src/features/auth/AuthScreen.js` | The sign-in UI, used by onboarding and Profile |
| `functions/delete-account/` | Account deletion, which needs the service role |

### Two rules the code keeps

**The phone wins.** `pushProgress()` only ever writes upward. The one exception
is `restoreFromAccount()`, used at exactly one moment — signing in during
onboarding on a fresh install, when there is nothing on the phone to lose.

**Signed out is normal.** Every screen works without an account. Only the Pals
tab asks for one, because there is genuinely nobody to be pals with otherwise.

### Security

The publishable key ships inside the app bundle — that is what it is for. Row
Level Security is the only thing separating one person's rows from another's,
so: every table has RLS on with no permissive fallback, every policy compares
against `auth.uid()` rather than anything the client sends, and every
`SECURITY DEFINER` function pins its `search_path`.

Search is the one place that has to look at strangers, so it goes through
`search_profiles()`, which returns a deliberately narrow set of columns —
handle, display name, buddy, streak — and never an email.

### Not built (deliberately)

- **The collection does not sync.** A pal's profile shows their numbers and
  says the words stay private, rather than showing an empty grid. Syncing it
  means Supabase Storage for the photos and a real bandwidth bill.
- **Photo sync.** Same reason — Storage plus the bandwidth that comes with it.
