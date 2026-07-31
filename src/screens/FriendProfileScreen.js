import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, RADIUS, SHADOW, getCategoryStyle } from '../config';

export default function FriendProfileScreen({ route, navigation }) {
  const { friend } = route.params;

  // Mock friend's collection data
  const [friendStickers] = useState([
    { id: '1', word: 'Manzana', english: 'Apple', language: 'es', category: 'food' },
    { id: '2', word: 'Gato', english: 'Cat', language: 'es', category: 'animal' },
    { id: '3', word: 'Libro', english: 'Book', language: 'es', category: 'object' },
    { id: '4', word: 'Casa', english: 'House', language: 'es', category: 'object' },
    { id: '5', word: 'Perro', english: 'Dog', language: 'es', category: 'animal' },
  ]);

  const speakWord = (word, language) => {
    Haptics.selectionAsync().catch(() => {});
    Speech.speak(word, { language, rate: 0.8 });
  };

  const getInitials = (name) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const renderSticker = ({ item }) => {
    const categoryStyle = getCategoryStyle(item.category);
    return (
      <View style={styles.stickerCard}>
        <View
          style={[styles.stickerThumb, { backgroundColor: `${categoryStyle.color}22` }]}
        >
          <Text style={styles.stickerEmoji}>{categoryStyle.emoji}</Text>
        </View>
        <View style={styles.stickerInfo}>
          <Text style={styles.stickerWord}>{item.word}</Text>
          <Text style={styles.stickerEnglish}>{item.english}</Text>
        </View>
        <TouchableOpacity
          style={styles.speakButton}
          onPress={() => speakWord(item.word, item.language)}
          hitSlop={8}
        >
          <Ionicons name="volume-medium" size={19} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const stats = [
    { label: 'Streak', value: `🔥 ${friend.streak || 0}` },
    { label: 'Today', value: friend.wordsToday || 0 },
    { label: 'Words', value: friendStickers.length },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={GRADIENTS.sky}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.profileSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(friend.name)}</Text>
            </View>
          </View>
          <Text style={styles.name}>{friend.name}</Text>

          <View style={styles.statsRow}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.stat}>
                <Text style={styles.statNumber}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      <View style={styles.collectionSection}>
        <Text style={styles.sectionTitle}>Their collection</Text>
        <Text style={styles.sectionSubtitle}>
          Tap the speaker to hear how they say it 🎧
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
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 26,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  backButton: {
    marginLeft: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: RADIUS.pill,
    padding: 9,
    alignSelf: 'flex-start',
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 25,
    fontWeight: '800',
    color: COLORS.sky,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.md,
    paddingVertical: 13,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 2,
    fontWeight: '600',
  },
  collectionSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 3,
    marginBottom: 16,
  },
  stickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 13,
    borderRadius: RADIUS.md,
    marginBottom: 10,
    gap: 13,
    ...SHADOW.soft,
  },
  stickerThumb: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
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
    fontWeight: '800',
    color: COLORS.text,
  },
  stickerEnglish: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  speakButton: {
    backgroundColor: `${COLORS.primary}15`,
    padding: 11,
    borderRadius: RADIUS.pill,
  },
});
