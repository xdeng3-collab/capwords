import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { COLORS, COINS, RADIUS, SHADOW } from '../config';
import { EmptyState, PixelButton } from '../components/UI';
import { useAlert } from '../components/PixelAlert';
import PixelIcon from '../components/PixelIcon';
import PetSprite from '../components/PetSprite';
import { useSession } from '../navigation/session';
import { addCoins } from '../services/storageService';
import { isSupabaseConfigured } from '../services/accountService';
import {
  cheer,
  listFriends,
  respondToRequest,
  searchUsers,
  sendFriendRequest,
} from '../services/friendService';

// Long enough that typing "sarah" is one query rather than four, short enough
// that the results still feel like they are keeping up.
const SEARCH_DEBOUNCE_MS = 300;

export default function FriendsScreen({ navigation }) {
  const showAlert = useAlert();
  const { user } = useSession();

  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Cheers are recorded server-side; this only holds the optimistic tick so
  // the button responds under the finger instead of after a round trip.
  const [cheered, setCheered] = useState({});

  const loadFriends = useCallback(async () => {
    if (!user) {
      setFriends([]);
      setIncoming([]);
      return;
    }
    const result = await listFriends();
    setFriends(result.friends);
    setIncoming(result.incoming);
    setCheered(
      Object.fromEntries(result.friends.filter((f) => f.cheeredToday).map((f) => [f.id, true]))
    );
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [loadFriends])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFriends();
    setRefreshing(false);
  };

  // Search runs on the server, so it is debounced rather than fired per
  // keystroke. The ref guards against a slow early query landing after a
  // faster later one and overwriting fresher results.
  const searchSeq = useRef(0);
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setIsSearching(false);
      setSearchResults([]);
      return undefined;
    }

    setIsSearching(true);
    setSearchBusy(true);
    const seq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      const result = await searchUsers(query);
      if (seq !== searchSeq.current) return;
      setSearchResults(result.results);
      setSearchBusy(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddFriend = async (person) => {
    Haptics.selectionAsync().catch(() => {});
    const result = await sendFriendRequest(person.username);
    if (!result.ok) {
      showAlert('Could not ask', result.error);
      return;
    }

    // The server auto-accepts when they had already asked you first.
    if (result.status === 'friends') {
      showAlert('You are pals!', `${person.name} had already asked you. You are both in.`);
    } else {
      showAlert('Request sent', `${person.name} will see your request next time they look.`);
    }

    setSearchQuery('');
    await loadFriends();
  };

  const handleRespond = async (person, accept) => {
    Haptics.selectionAsync().catch(() => {});
    const result = await respondToRequest(person.friendshipId, accept);
    if (!result.ok) showAlert('Could not answer', result.error);
    await loadFriends();
  };

  // Duolingo-style congrats: cheer each friend once per day. The database
  // decides whether it counted, so the coin is only awarded when it did —
  // that is what stops a reinstall from farming the bonus.
  const handleCheer = async (friend) => {
    if (cheered[friend.id]) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCheered((c) => ({ ...c, [friend.id]: true }));

    const result = await cheer(friend.id);
    if (result.awarded) {
      await addCoins(COINS.cheerBonus);
    } else if (!result.ok) {
      setCheered((c) => ({ ...c, [friend.id]: false }));
    }
  };

  const getAvatarInitials = (name) =>
    (name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const renderFriend = ({ item }) => (
    <TouchableOpacity
      style={styles.friendCard}
      onPress={() => navigation.navigate('FriendProfile', { friend: item })}
    >
      {item.pet ? (
        <View style={styles.petAvatar}>
          <PetSprite
            mood="content"
            species={item.pet.species}
            outfit={item.pet.outfit}
            pixelSize={2.4}
            animate={false}
          />
        </View>
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{getAvatarInitials(item.name)}</Text>
        </View>
      )}

      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.name}</Text>
        <View style={styles.friendStats}>
          <PixelIcon name="flame" size={12} color={COLORS.streak} light={COLORS.sun} />
          <Text style={styles.statText}>{item.streak || 0} day streak</Text>
          <Text style={styles.statLabel}>· {item.wordsToday || 0} today</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.cheerButton, cheered[item.id] && styles.cheerButtonDone]}
        onPress={() => handleCheer(item)}
        hitSlop={8}
      >
        <PixelIcon
          name={cheered[item.id] ? 'check' : 'heart'}
          size={14}
          color={cheered[item.id] ? COLORS.leafDark : COLORS.secondary}
        />
        <Text style={[styles.cheerText, cheered[item.id] && styles.cheerTextDone]}>
          {cheered[item.id] ? '+1 SENT' : 'CHEER'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // The trailing control depends on where the two of you already stand, so
  // nobody sends a second request to someone who is already a pal.
  const renderSearchResult = ({ item }) => (
    <View style={styles.searchResultCard}>
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>{getAvatarInitials(item.name)}</Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.name}</Text>
        <Text style={styles.searchSubtext}>
          @{item.username} · {item.streak} day streak
        </Text>
      </View>

      {item.status === 'friends' ? (
        <Text style={styles.resultTag}>PAL</Text>
      ) : item.status === 'pending_out' ? (
        <Text style={styles.resultTag}>ASKED</Text>
      ) : item.status === 'pending_in' ? (
        <TouchableOpacity style={styles.addButton} onPress={() => handleAddFriend(item)}>
          <PixelIcon name="check" size={16} color={COLORS.primaryDark} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.addButton} onPress={() => handleAddFriend(item)}>
          <PixelIcon name="add" size={16} color={COLORS.primaryDark} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderRequest = (item) => (
    <View key={item.friendshipId} style={styles.searchResultCard}>
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>{getAvatarInitials(item.name)}</Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.name}</Text>
        <Text style={styles.searchSubtext}>@{item.username} wants to be pals</Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => handleRespond(item, true)}>
        <PixelIcon name="check" size={16} color={COLORS.primaryDark} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.declineButton} onPress={() => handleRespond(item, false)}>
        <PixelIcon name="close" size={14} color={COLORS.textLight} />
      </TouchableOpacity>
    </View>
  );

  // Pals are the one part of CapWords that genuinely cannot work on-device:
  // there is no one to be pals with until there is an account.
  if (isSupabaseConfigured && !user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>FRIENDS</Text>
          <Text style={styles.subtitle}>LEARN ALONGSIDE YOUR PALS</Text>
        </View>
        <EmptyState
          mood="neutral"
          title="SIGN IN TO FIND PALS"
          subtitle="An account lets you add friends, cheer their streaks, and keep them if you change phones. Your words and photos stay on this phone either way."
          action={
            <PixelButton
              label="SIGN IN"
              size="lg"
              style={styles.signInButton}
              onPress={() => navigation.navigate('Auth')}
            />
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>FRIENDS</Text>
        <Text style={styles.subtitle}>
          {friends.length > 0
            ? `${friends.length} LEARNING BUDDIES`
            : 'FIND BUDDIES TO LEARN WITH'}
        </Text>

        <View style={styles.searchBar}>
          <PixelIcon name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Find pals by username"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchBusy ? <ActivityIndicator size="small" color={COLORS.textMuted} /> : null}
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <PixelIcon name="close" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        <View style={styles.searchResults}>
          <Text style={styles.sectionTitle}>SEARCH RESULTS</Text>
          {searchResults.length === 0 && !searchBusy ? (
            <Text style={styles.noResultsText}>No one is using that username yet</Text>
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      ) : friends.length === 0 && incoming.length === 0 ? (
        <EmptyState
          mood="neutral"
          title="NO PALS YET"
          subtitle="Search for a username above to send your first request, and cheer each other's streaks."
        />
      ) : (
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          ListHeaderComponent={
            incoming.length ? (
              <View style={styles.requestsBlock}>
                <Text style={styles.requestsTitle}>WAITING FOR YOU</Text>
                {incoming.map(renderRequest)}
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: COLORS.panel,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.outline,
  },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.text, letterSpacing: 1.5 },
  subtitle: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 3,
    borderColor: COLORS.outline,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    marginTop: 16,
    ...SHADOW.soft,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, padding: 0, fontWeight: '600' },
  searchResults: { flex: 1, paddingTop: 18 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 1,
    marginBottom: 10,
    paddingHorizontal: 22,
  },
  noResultsText: {
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 3,
    borderColor: COLORS.outline,
    marginBottom: 10,
    gap: 12,
    ...SHADOW.soft,
  },
  searchSubtext: { fontSize: 12, color: COLORS.textLight, marginTop: 2, fontWeight: '600' },
  resultTag: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: COLORS.textMuted,
    paddingHorizontal: 8,
  },
  declineButton: {
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
  },
  requestsBlock: { marginBottom: 8 },
  requestsTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 1,
    marginBottom: 10,
  },
  signInButton: { marginTop: 18, alignSelf: 'stretch' },
  addButton: {
    backgroundColor: COLORS.sun,
    padding: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
  },
  listContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 3,
    borderColor: COLORS.outline,
    marginBottom: 10,
    gap: 12,
    ...SHADOW.soft,
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.sun,
    borderWidth: 2,
    borderColor: COLORS.outline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '900', color: COLORS.primaryDark },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  friendStats: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 },
  statText: { fontSize: 12, color: COLORS.text, fontWeight: '800' },
  statLabel: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  petAvatar: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.sm,
    backgroundColor: `${COLORS.sky}44`,
    borderWidth: 2,
    borderColor: COLORS.outline,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cheerButton: {
    alignItems: 'center',
    gap: 2,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: `${COLORS.secondary}22`,
  },
  cheerButtonDone: {
    backgroundColor: `${COLORS.leaf}22`,
  },
  cheerText: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },
  cheerTextDone: {
    color: COLORS.leafDark,
  },
});
