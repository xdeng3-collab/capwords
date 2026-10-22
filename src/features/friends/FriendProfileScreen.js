import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { COINS } from '../../config';
import { COLORS, RADIUS, SHADOW } from '../../theme';
import { BackButton, PetSprite, PixelButton, useAlert } from '../../components';
import { cheer, unfriend } from '../../services/friendService';
import { addCoins } from '../../services/walletService';
import { successFeedback } from '../../utils/haptics';

// Stand-in buddy for the rare pal whose profile has not synced a pet yet.
const FALLBACK_PET = { name: 'Buddy', species: 'cat', outfit: 'none' };

export default function FriendProfileScreen({ route, navigation }) {
  const { friend } = route.params;
  const showAlert = useAlert();
  // The same daily cheer as the Pals list: it reaches them, and the database
  // decides whether it counted (once a day), which is when the coin is paid.
  const [cheered, setCheered] = useState(Boolean(friend.cheeredToday));

  const pet = friend.pet?.species ? friend.pet : FALLBACK_PET;
  const firstName = friend.name.split(' ')[0];

  const handleCheer = async () => {
    if (cheered) return;
    successFeedback();
    setCheered(true);
    const result = await cheer(friend.id);
    if (result.awarded) {
      await addCoins(COINS.cheerBonus);
    } else if (!result.ok) {
      setCheered(false);
      showAlert('Could not cheer', result.error || 'Check your connection and try again.');
    }
  };

  const handleRemove = () => {
    showAlert('Remove pal', `Remove ${friend.name} from your pals?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await unfriend(friend.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const stats = [
    { label: 'STREAK', value: friend.streak || 0 },
    { label: 'TODAY', value: friend.wordsToday || 0 },
    { label: 'WORDS', value: friend.totalWords || 0 },
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
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerName} numberOfLines={1}>
            {friend.name}
          </Text>
        </View>

        {/* Pet show: their buddy is the star of the profile */}
        <View style={styles.petStage}>
          <View style={styles.skyStrip} />
          <PetSprite
            mood={cheered ? 'happy' : 'content'}
            species={pet.species}
            outfit={pet.outfit}
            pixelSize={9}
          />
          <Text style={styles.petName}>{pet.name}</Text>
          <Text style={styles.petCaption}>
            {cheered
              ? `You cheered ${firstName} on today!`
              : `${firstName}'s buddy`}
          </Text>
          <PixelButton
            label={cheered ? 'Cheered today' : `Cheer ${firstName} on`}
            icon={cheered ? 'check' : 'heart'}
            color={cheered ? COLORS.textMuted : COLORS.secondary}
            style={styles.feedButton}
            onPress={handleCheer}
            disabled={cheered}
          />
          {!cheered ? (
            <Text style={styles.cheerHint}>Once a day. You get +{COINS.cheerBonus} coin for cheering.</Text>
          ) : null}
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

      {/* Their words and photos never leave their phone, so there is no
          collection to show here — only the numbers they share. Saying so
          beats an empty grid that looks broken. */}
      <View style={styles.collectionSection}>
        <Text style={styles.sectionTitle}>THEIR COLLECTION</Text>
        <Text style={styles.sectionSubtitle}>
          {firstName} has learned {friend.totalWords || 0}{' '}
          {friend.totalWords === 1 ? 'word' : 'words'}, with a best streak of{' '}
          {friend.longestStreak || 0}. The words themselves stay private on their phone.
        </Text>
      </View>

      {/* Quiet footer action, out of the way of everyday browsing */}
      <TouchableOpacity style={styles.removeLink} onPress={handleRemove} hitSlop={8}>
        <Text style={styles.removeLinkText}>Remove {firstName} from pals</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cheerHint: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginTop: 8 },
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
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 6,
    lineHeight: 19,
    fontWeight: '600',
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
