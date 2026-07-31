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
import { COLORS, RADIUS, SHADOW, getCategoryStyle } from '../config';
import PixelIcon from '../components/PixelIcon';

export default function FriendProfileScreen({ route, navigation }) {
  const { friend } = route.params;

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
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const renderSticker = ({ item }) => {
    const categoryStyle = getCategoryStyle(item.category);
    return (
      <View style={styles.stickerCard}>
        <View style={[styles.stickerThumb, { backgroundColor: `${categoryStyle.color}33` }]}>
          <PixelIcon name={categoryStyle.icon} size={22} color={categoryStyle.color} />
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
          <PixelIcon name="sound" size={16} color={COLORS.primaryDark} />
        </TouchableOpacity>
      </View>
    );
  };

  const stats = [
    { label: 'STREAK', value: friend.streak || 0 },
    { label: 'TODAY', value: friend.wordsToday || 0 },
    { label: 'WORDS', value: friendStickers.length },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={10}>
          <PixelIcon name="arrowLeft" size={18} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(friend.name)}</Text>
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
      </View>

      <View style={styles.collectionSection}>
        <Text style={styles.sectionTitle}>THEIR COLLECTION</Text>
        <Text style={styles.sectionSubtitle}>Tap the speaker to hear how they say it</Text>

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
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 120 },
  header: {
    paddingTop: 56,
    paddingBottom: 22,
    backgroundColor: COLORS.panel,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.outline,
  },
  backButton: {
    marginLeft: 20,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
    padding: 8,
    alignSelf: 'flex-start',
  },
  profileSection: { alignItems: 'center', marginTop: 10, paddingHorizontal: 20 },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.sun,
    borderWidth: 3,
    borderColor: COLORS.outline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '900', color: COLORS.primaryDark },
  name: { fontSize: 21, fontWeight: '900', color: COLORS.text, marginTop: 12, letterSpacing: 0.5 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 18,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 3,
    borderColor: COLORS.outline,
    paddingVertical: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  statLabel: { fontSize: 9, color: COLORS.textLight, marginTop: 2, fontWeight: '900', letterSpacing: 0.5 },
  collectionSection: { padding: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: COLORS.text, letterSpacing: 0.8 },
  sectionSubtitle: { fontSize: 12, color: COLORS.textLight, marginTop: 3, marginBottom: 16, fontWeight: '600' },
  stickerCard: {
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
  stickerThumb: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickerInfo: { flex: 1 },
  stickerWord: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  stickerEnglish: { fontSize: 12, color: COLORS.textLight, marginTop: 2, fontWeight: '600' },
  speakButton: {
    backgroundColor: COLORS.sun,
    padding: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
  },
});
