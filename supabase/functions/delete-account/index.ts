import { withSupabase } from 'npm:@supabase/server'

/**
 * Delete the signed-in person's account, for real.
 *
 * This has to be an Edge Function rather than something the app calls
 * directly: removing a row from `auth.users` needs the service role, and the
 * service role key must never be anywhere near a phone. Here it stays on
 * Supabase's side, and the only thing the app can ask is "delete *me*" — the
 * user id comes from the verified JWT, never from the request body, so there
 * is no id to tamper with.
 *
 * Everything in `public` hangs off `auth.users` with `on delete cascade`, so
 * the profile, both sides of every friendship, and every cheer go with it.
 * The words and photos were never here — they live on the phone, and the app
 * erases them separately.
 *
 * Deploy with:  npx supabase functions deploy delete-account
 */
export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const { supabaseAdmin, userClaims, jwtClaims } = ctx
    const userId = userClaims?.id ?? jwtClaims?.sub

    if (!userId) {
      return Response.json({ error: 'Not signed in.' }, { status: 401 })
    }

    // Revoke sessions before deleting. Deleting a user does NOT invalidate
    // access tokens that are already out there — the refresh tokens die with
    // the row, but a JWT issued a minute ago stays cryptographically valid
    // until it expires. Signing out globally first closes that window as far
    // as it can be closed.
    const authorization = req.headers.get('Authorization') ?? ''
    const jwt = authorization.replace(/^Bearer\s+/i, '')
    if (jwt) {
      await supabaseAdmin.auth.admin.signOut(jwt, 'global').catch(() => {})
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) {
      console.error('delete-account failed', { userId, message: error.message })
      return Response.json({ error: 'Could not delete the account.' }, { status: 500 })
    }

    return Response.json({ deleted: true })
  }),
}
