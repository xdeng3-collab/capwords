import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, RADIUS, SHADOW } from '../config';
import { EmptyState } from '../components/UI';
import { getFriends, addFriend, removeFriend } from '../services/storageService';

// Mock friend data for demo purposes
const MOCK_FRIENDS_SEARCH = [
  { id: '101', name: 'Sarah Chen', avatar: null, streak: 12, wordsToday: 8 },
  { id: '102', name: 'Marco Rivera', avatar: null, streak: 45, wordsToday: 5 },
  { id: '103', name: 'Yuki Tanaka', avatar: null, streak: 7, wordsToday: 3 },
  { id: '104', name: 'Priya Sharma', avatar: null, streak: 23, wordsToday: 10 },
];

export default function FriendsScreen({ navigation }) {
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const loadFriends = async () => {
    const data = await getFriends();
    setFriends(data);
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
      // Simulate search - in production, this would call a backend API
      const results = MOCK_FRIENDS_SEARCH.filter(f => 
        f.name.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const handleAddFriend = async (friend) => {
    const existing = friends.find(f => f.id === friend.id);
    if (existing) {
      Alert.alert('Already Friends', `You're already friends with ${friend.name}`);
      return;
    }
    
    await addFriend(friend);
    await loadFriends();
    setSearchQuery('');
    setIsSearching(false);
    Alert.alert('Friend Added!', `${friend.name} has been added to your friends.`);
  };

  const handleRemoveFriend = (friend) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            await removeFriend(friend.id);
            await loadFriends();
          }
        },
      ]
    );
  };

  const getAvatarInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const renderFriend = ({ item }) => (
    <TouchableOpacity 
      style={styles.friendCard}
      onPress={() => navigation.navigate('FriendProfile', { friend: item })}
    >
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{getAvatarInitials(item.name)}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.name}</Text>
        <View style={styles.friendStats}>
          <View style={styles.statItem}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.statText}>{item.streak || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Today:</Text>
            <Text style={styles.statText}>{item.wordsToday || 0} words</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.moreButton}
        onPress={() => handleRemoveFriend(item)}
      >
        <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textLight} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }) => (
    <View style={styles.searchResultCard}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{getAvatarInitials(item.name)}</Text>
        </View>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.name}</Text>
        <Text style={styles.searchSubtext}>🔥 {item.streak} day streak</Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => handleAddFriend(item)}>
        <Ionicons name="person-add" size={18} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.sky}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.title}>Friends</Text>
        <Text style={styles.subtitle}>
          {friends.length > 0
            ? `${friends.length} learning buddies 🎉`
            : 'Find buddies to learn with 🌟'}
        </Text>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={19} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends by name…"
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
              <Ionicons name="close-circle" size={19} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Search Results */}
      {isSearching ? (
        <View style={styles.searchResults}>
          <Text style={styles.sectionTitle}>Search results</Text>
          {searchResults.length === 0 ? (
            <Text style={styles.noResultsText}>No one found with that name 🤔</Text>
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
          emoji="👋"
          title="No friends yet"
          subtitle="Search for friends to peek at their sticker collections and cheer on their streaks!"
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 62,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    marginTop: 18,
    ...SHADOW.soft,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  searchResults: {
    flex: 1,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    paddingHorizontal: 24,
  },
  noResultsText: {
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 24,
    fontSize: 15,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: RADIUS.md,
    marginBottom: 10,
    ...SHADOW.soft,
  },
  searchSubtext: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: `${COLORS.primary}15`,
    padding: 11,
    borderRadius: RADIUS.pill,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: RADIUS.md,
    marginBottom: 10,
    ...SHADOW.soft,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  friendStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakIcon: {
    fontSize: 14,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  statText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  moreButton: {
    padding: 8,
  },
});
