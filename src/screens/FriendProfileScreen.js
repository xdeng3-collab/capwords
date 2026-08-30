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
import { PixelButton } from '../components/UI';
import { useAlert } from '../components/PixelAlert';
import PixelIcon from '../components/PixelIcon';
import PetSprite from '../components/PetSprite';
import { removeFriend } from '../services/storageService';

// Fallback buddies for friends added before pets existed.
const FALLBACK_PETS = [
  { name: 'Pip', species: 'cat', outfit: 'none' },
  { name: 'Biscuit', species: 'dog', outfit: 'none' },
  { name: 'Clover', species: 'bunny', outfit: 'none' },
];

export default function FriendProfileScreen({ route, navigation }) {
  const { friend } = route.params;
  const showAlert = useAlert();
  const [fed, setFed] = useState(false);

  const pet =
    friend.pet || FALLBACK_PETS[Number(friend.id || 0) % FALLBACK_PETS.length];

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

  const handleFeed = () => {
    if (fed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setFed(true);
  };

  const handleRemove = () => {
    showAlert('Remove friend', `Are you sure you want to remove ${friend.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeFriend(friend.id);
          navigation.goBack();
        },
      },
    ]);
  };

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
      {/* Header: friend name sits next to the back button */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={10}
          >
            <PixelIcon name="arrowLeft" size={18} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerName} numberOfLines={1}>
            {friend.name}
          </Text>
        </View>

        {/* Pet show: their buddy is the star of the profile */}
        <View style={styles.petStage}>
          <View style={styles.skyStrip} />
          <PetSprite
            mood={fed ? 'happy' : 'content'}
            species={pet.species}
            outfit={pet.outfit}
            pixelSize={9}
          />
          <Text style={styles.petName}>{pet.name}</Text>
          <Text style={styles.petCaption}>
            {fed
              ? `${pet.name} loved the snack you shared!`
              : `${friend.name.split(' ')[0]}'s buddy`}
          </Text>
          <PixelButton
            label={fed ? 'Fed today' : `Help feed ${pet.name}`}
            icon={fed ? 'check' : 'apple'}
            color={fed ? COLORS.textMuted : COLORS.leaf}
            style={styles.feedButton}
            onPress={handleFeed}
            disabled={fed}
          />
        </View>

        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text style={styles.statNumber}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
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

      {/* Quiet footer action, out of the way of everyday browsing */}
      <TouchableOpacity style={styles.removeLink} onPress={handleRemove} hitSlop={8}>
        <Text style={styles.removeLinkText}>Remove {friend.name.split(' ')[0]} from friends</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 120 },
  header: {
    paddingTop: 56,
    paddingBottom: 22,
    paddingHorizontal: 20,
    backgroundColor: COLORS.panel,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.outline,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
    padding: 8,
  },
  headerName: {
    flex: 1,
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  petStage: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 18,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 3,
    borderColor: COLORS.outline,
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  skyStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
    backgroundColor: COLORS.sky,
    opacity: 0.35,
  },
  petName: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 10,
    letterSpacing: 1,
  },
  petCaption: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
    fontWeight: '700',
  },
  feedButton: {
    marginTop: 12,
    alignSelf: 'stretch',
    marginHorizontal: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 14,
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
  removeLink: {
    alignSelf: 'center',
    marginTop: 6,
    padding: 10,
  },
  removeLinkText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
