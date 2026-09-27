import { supabase, friendlyError } from './supabase';
import { getCurrentUser } from './accountService';

/**
 * Pals, backed by the friend graph in Supabase.
 *
 * Every call here goes through a database function rather than querying the
 * tables directly. That is on purpose: search has to look at people you are
 * not friends with yet, which row level security correctly forbids, so the
 * server-side function is the one place allowed to peek - and it hands back
 * only the handful of columns a stranger may see.
 *
 * Rows come back in the snake_case the database uses; everything is mapped to
 * the shape the Pals screen already renders so the UI did not have to change
 * its card layout.
 */

function toCard(row) {
  return {
    // The friend's user id, which is what the rest of the app keys pals on.
    id: row.id,
    friendshipId: row.friendship_id || null,
    username: row.username,
    name: row.display_name,
    streak: row.current_streak || 0,
    longestStreak: row.longest_streak || 0,
    wordsToday: row.words_today || 0,
    totalWords: row.total_words || 0,
    pet: {
      name: row.pet_name,
      species: row.pet_species,
      outfit: row.pet_outfit,
    },
    // 'friends' | 'pending_in' | 'pending_out' | 'none'
    status: row.status,
    cheeredToday: Boolean(row.cheered_today),
    avatar: null,
  };
}

/** Find people by handle or name. Needs two characters; returns at most 20. */
export async function searchUsers(query) {
  if (!supabase) return { ok: false, results: [] };
  const q = (query || '').trim();
  if (q.length < 2) return { ok: true, results: [] };

  const { data, error } = await supabase.rpc('search_profiles', { q });
  if (error) return { ok: false, error: friendlyError(error), results: [] };
  return { ok: true, results: (data || []).map(toCard) };
}

/**
 * Everything the Pals screen shows, in one round trip: accepted pals plus
 * requests in both directions, already split up.
 */
export async function listFriends() {
  if (!supabase) return { ok: false, friends: [], incoming: [], outgoing: [] };
  const user = await getCurrentUser();
  if (!user) return { ok: false, signedOut: true, friends: [], incoming: [], outgoing: [] };

  const { data, error } = await supabase.rpc('list_friends');
  if (error) {
    return { ok: false, error: friendlyError(error), friends: [], incoming: [], outgoing: [] };
  }

  const cards = (data || []).map(toCard);
  return {
    ok: true,
    friends: cards.filter((c) => c.status === 'friends'),
    incoming: cards.filter((c) => c.status === 'pending_in'),
    outgoing: cards.filter((c) => c.status === 'pending_out'),
  };
}

/**
 * Ask someone to be pals. Returns the resulting status, which is 'friends'
 * straight away when they had already asked you - both people tapping Add
 * should mean yes, not two requests nobody can answer.
 */
export async function sendFriendRequest(username) {
  if (!supabase) return { ok: false, error: 'Pals need an account.' };

  const { data, error } = await supabase.rpc('send_friend_request', {
    target_username: (username || '').trim().toLowerCase(),
  });
  if (error) return { ok: false, error: friendlyError(error) };

  if (data === 'no_such_user') return { ok: false, error: 'No one is using that username.' };
  if (data === 'self') return { ok: false, error: 'That one is you!' };
  return { ok: true, status: data };
}

export async function respondToRequest(friendshipId, accept) {
  if (!supabase) return { ok: false, error: 'Pals need an account.' };

  const { data, error } = await supabase.rpc('respond_friend_request', {
    friendship: friendshipId,
    accept,
  });
  if (error) return { ok: false, error: friendlyError(error) };
  if (data === 'not_found') return { ok: false, error: 'That request is no longer waiting.' };
  return { ok: true, status: data };
}

/**
 * Cheer a pal. `awarded` is true only the first time today - the database
 * decides, not the phone, so reinstalling cannot farm the coin bonus.
 */
export async function cheer(userId) {
  if (!supabase) return { ok: false, awarded: false };

  const { data, error } = await supabase.rpc('cheer_friend', { target: userId });
  if (error) return { ok: false, awarded: false, error: friendlyError(error) };
  return { ok: true, awarded: Boolean(data) };
}

/** Stop being pals, or withdraw a request you sent. */
export async function unfriend(userId) {
  if (!supabase) return { ok: false };
  const { error } = await supabase.rpc('unfriend', { other: userId });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true };
}
