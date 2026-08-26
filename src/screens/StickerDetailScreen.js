import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync } from 'expo-audio';
import { format } from 'date-fns';
import { COLORS, RADIUS, SHADOW, getCategoryStyle } from '../config';
import { PixelPanel, PixelButton } from '../components/UI';
import PixelIcon from '../components/PixelIcon';

export default function StickerDetailScreen({ route, navigation }) {
  const { sticker } = route.params;
  const categoryStyle = getCategoryStyle(sticker.category);

  const speakWord = async () => {
    Haptics.selectionAsync().catch(() => {});
    // Playback mode so TTS is audible even after recording / on silent mode.
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    Speech.speak(sticker.word, { language: sticker.language, rate: 0.8 });
  };

  const details = [
    sticker.language && { label: 'Language', value: sticker.language.toUpperCase() },
    sticker.createdAt && {
      label: 'Learned on',
      value: format(new Date(sticker.createdAt), 'MMM d, yyyy'),
    },
    sticker.location?.place && { label: 'Learned at', value: sticker.location.place },
  ].filter(Boolean);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={10}>
          <PixelIcon name="arrowLeft" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>STICKER</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Framed sticker */}
        <View style={styles.imageFrame}>
          {sticker.imageUri ? (
            <Image source={{ uri: sticker.imageUri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <PixelIcon name={categoryStyle.icon} size={72} color={categoryStyle.color} />
            </View>
          )}
        </View>

        {/* Word */}
        <View style={styles.wordSection}>
          <Text style={styles.word}>{sticker.word}</Text>
          {sticker.pronunciation ? (
            <Text style={styles.pronunciation}>/{sticker.pronunciation}/</Text>
          ) : null}
          {sticker.english ? <Text style={styles.english}>{sticker.english}</Text> : null}
        </View>

        <PixelButton
          label="Listen to pronunciation"
          icon="sound"
          onPress={speakWord}
          size="lg"
          style={styles.listenButton}
        />

        {sticker.exampleSentence || sticker.funFact ? (
          <PixelPanel style={styles.learnCard}>
            {sticker.exampleSentence ? (
              <>
                <Text style={styles.learnSentence}>"{sticker.exampleSentence}"</Text>
                {sticker.sentenceTranslation ? (
                  <Text style={styles.learnTranslation}>{sticker.sentenceTranslation}</Text>
                ) : null}
              </>
            ) : null}
            {sticker.funFact ? <Text style={styles.learnFact}>★ {sticker.funFact}</Text> : null}
          </PixelPanel>
        ) : null}

        {details.length > 0 ? (
          <PixelPanel style={styles.detailsCard}>
            {details.map((detail, index) => (
              <View
                key={detail.label}
                style={[styles.detailRow, index === details.length - 1 && styles.detailRowLast]}
              >
                <Text style={styles.detailLabel}>{detail.label}</Text>
                <Text style={styles.detailValue}>{detail.value}</Text>
              </View>
            ))}
          </PixelPanel>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
    padding: 8,
  },
  headerTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text, letterSpacing: 1 },
  headerSpacer: { width: 40 },
  content: { padding: 20, alignItems: 'center' },
  imageFrame: {
    width: 216,
    height: 216,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 4,
    borderColor: COLORS.outline,
    overflow: 'hidden',
    marginBottom: 22,
    ...SHADOW.glow,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordSection: { alignItems: 'center', marginBottom: 24 },
  word: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  pronunciation: { fontSize: 17, color: COLORS.textLight, marginTop: 5, fontWeight: '700' },
  english: { fontSize: 15, color: COLORS.textMuted, marginTop: 3, fontWeight: '700' },
  pill: { marginTop: 12 },
  listenButton: { width: '100%', marginBottom: 22 },
  learnCard: { width: '100%', marginBottom: 18, gap: 4 },
  learnSentence: { fontSize: 15, fontWeight: '800', color: COLORS.text, lineHeight: 21 },
  learnTranslation: { fontSize: 13, color: COLORS.textLight, fontWeight: '600', lineHeight: 18 },
  learnFact: { fontSize: 13, color: COLORS.primaryDark, fontWeight: '700', marginTop: 4, lineHeight: 18 },
  detailsCard: { width: '100%' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.panel,
  },
  detailRowLast: { borderBottomWidth: 0, paddingBottom: 2 },
  detailLabel: { fontSize: 13, color: COLORS.textLight, fontWeight: '800' },
  detailValue: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    textTransform: 'uppercase',
  },
});
