import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS, SHADOW } from '../config';
import { EmptyState } from '../components/UI';
import PixelIcon from '../components/PixelIcon';
import PetSprite from '../components/PetSprite';
import {
  getFriends,
  addFriend,
  getTodayCheers,
  cheerFriend,
} from '../services/storageService';

// Mock friend data for demo purposes
const MOCK_FRIENDS_SEARCH = [
  { id: '101', name: 'Sarah Chen', avatar: null, streak: 12, wordsToday: 8, pet: { name: 'Mochi', species: 'bunny', outfit: 'bow' } },
  { id: '102', name: 'Marco Rivera', avatar: null, streak: 45, wordsToday: 5, pet: { name: 'Rocky', species: 'dog', outfit: 'cap' } },
  { id: '103', name: 'Yuki Tanaka', avatar: null, streak: 7, wordsToday: 3, pet: { name: 'Tofu', species: 'cat', outfit: 'none' } },
  { id: '104', name: 'Priya Sharma', avatar: null, streak: 23, wordsToday: 10, pet: { name: 'Laddu', species: 'cat', outfit: 'crown' } },
];

export default function FriendsScreen({ navigation }) {
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cheered, setCheered] = useState({});

  const loadFriends = async () => {
    const [data, cheers] = await Promise.all([getFriends(), getTodayCheers()]);
    setFriends(data);
    setCheered(cheers.ids);
  };

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [])
  );

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.length > 1) {
      setIsSearching(true);
      const results = MOCK_FRIENDS_SEARCH.filter((f) =>
        f.name.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const handleAddFriend = async (friend) => {
    const existing = friends.find((f) => f.id === friend.id);
    if (existing) {
      Alert.alert('Already Friends', `You're already friends with ${friend.name}`);
      return;
    }
    await addFriend(friend);
    await loadFriends();
    setSearchQuery('');
    setIsSearching(false);
    Alert.alert('Friend Added', `${friend.name} has been added to your friends.`);
  };

  // Duolingo-style congrats: cheer each friend once per day (resets at midnight).
  const handleCheer = async (friend) => {
    if (cheered[friend.id]) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCheered((c) => ({ ...c, [friend.id]: true }));
    await cheerFriend(friend.id);
  };

  const getAvatarInitials = (name) =>
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

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
          {cheered[item.id] ? 'SENT' : 'CHEER'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }) => (
    <View style={styles.searchResultCard}>
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>{getAvatarInitials(item.name)}</Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.name}</Text>
        <Text style={styles.searchSubtext}>{item.streak} day streak</Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => handleAddFriend(item)}>
        <PixelIcon name="add" size={16} color={COLORS.primaryDark} />
      </TouchableOpacity>
    </View>
  );

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
            placeholder="Search friends by name"
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setIsSearching(false);
              }}
              hitSlop={8}
            >
              <PixelIcon name="close" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        <View style={styles.searchResults}>
          <Text style={styles.sectionTitle}>SEARCH RESULTS</Text>
          {searchResults.length === 0 ? (
            <Text style={styles.noResultsText}>No one found with that name</Text>
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      ) : friends.length === 0 ? (
        <EmptyState
          mood="neutral"
          title="NO FRIENDS YET"
          subtitle="Search for friends to peek at their sticker collections and cheer on their streaks."
        />
      ) : (
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
