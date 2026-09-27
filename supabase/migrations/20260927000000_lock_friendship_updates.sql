-- Only the functions may change a friendship's status.
--
-- The first migration let either person in a friendship UPDATE the row
-- directly through the Data API. That included the requester, so anyone could
-- send a request and then flip their own row to 'accepted' without the other
-- person ever answering - after which profiles_select_self_or_friend hands
-- them that stranger's whole profile row.
--
-- Nothing in the app updates this table directly: accepting, declining and
-- re-sending all go through respond_friend_request() and send_friend_request(),
-- which are SECURITY DEFINER, run as the table owner, and do their own
-- auth.uid() checks. So the direct path is removed outright rather than
-- narrowed.
--
-- Re-runnable, like the first migration.

drop policy if exists friendships_update_involved on public.friendships;

revoke update on public.friendships from authenticated;
