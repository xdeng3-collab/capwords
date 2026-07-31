import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ScrollView,
} from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config';

export default function FriendProfileScreen({ route, navigation }) {
  const { friend } = route.params;

  // Mock friend's collection data
  const [friendStickers] = useState([
    { id: '1', word: 'Manzana', english: 'Apple', language: 'es', imageUri: null },
    { id: '2', word: 'Gato', english: 'Cat', language: 'es', imageUri: null },
    { id: '3', word: 'Libro', english: 'Book', language: 'es', imageUri: null },
    { id: '4', word: 'Casa', english: 'House', language: 'es', imageUri: null },
    { id: '5', word: 'Perro', english: 'Dog', language: 'es', imageUri: null },
  ]);

  const speakWord = (word, language) => {
    Speech.speak(word, { language, rate: 0.8 });
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const renderSticker = ({ item }) => (
    <View style={styles.stickerCard}>
      <View style={styles.stickerImagePlaceholder}>
        <Text style={styles.stickerEmoji}>📷</Text>
      </View>
      <View style={styles.stickerInfo}>
        <Text style={styles.stickerWord}>{item.word}</Text>
        <Text style={styles.stickerEnglish}>{item.english}</Text>
      </View>
      <TouchableOpacity
        style={styles.speakButton}
        onPress={() => speakWord(item.word, item.language)}
      >
        <Ionicons name="volume-medium" size={20} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(friend.name)}</Text>
          </View>
          <Text style={styles.name}>{friend.name}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>🔥 {friend.streak || 0}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{friend.wordsToday || 0}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{friendStickers.length}</Text>
              <Text style={styles.statLabel}>Words</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Friend's Collection */}
      <View style={styles.collectionSection}>
        <Text style={styles.sectionTitle}>Their Collection</Text>
        <Text style={styles.sectionSubtitle}>
          Tap the speaker to hear their pronunciation
        </Text>

        <FlatList
          data={friendStickers}
          renderItem={renderSticker}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 55,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 30,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  collectionSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  stickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  stickerImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickerEmoji: {
    fontSize: 22,
  },
  stickerInfo: {
    flex: 1,
  },
  stickerWord: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  stickerEnglish: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  speakButton: {
    backgroundColor: COLORS.primary + '15',
    padding: 10,
    borderRadius: 12,
  },
});
