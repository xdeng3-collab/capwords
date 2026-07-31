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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { COLORS, GRADIENTS, RADIUS, SHADOW, getCategoryStyle } from '../config';
import { Card, GradientButton, Pill } from '../components/UI';

export default function StickerDetailScreen({ route, navigation }) {
  const { sticker } = route.params;
  const categoryStyle = getCategoryStyle(sticker.category);

  const speakWord = () => {
    Haptics.selectionAsync().catch(() => {});
    Speech.speak(sticker.word, { language: sticker.language, rate: 0.8 });
  };

  const details = [
    sticker.category && {
      label: 'Category',
      value: `${categoryStyle.emoji}  ${sticker.category}`,
    },
    sticker.language && { label: 'Language', value: sticker.language.toUpperCase() },
    sticker.createdAt && {
      label: 'Learned on',
      value: format(new Date(sticker.createdAt), 'MMM d, yyyy'),
    },
  ].filter(Boolean);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sticker</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Framed sticker */}
        <LinearGradient
          colors={GRADIENTS.candy}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.imageFrame}
        >
          <View style={styles.imageInner}>
            {sticker.imageUri ? (
              <Image source={{ uri: sticker.imageUri }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderEmoji}>{categoryStyle.emoji}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Word */}
        <View style={styles.wordSection}>
          <Text style={styles.word}>{sticker.word}</Text>
          {sticker.pronunciation ? (
            <Text style={styles.pronunciation}>/{sticker.pronunciation}/</Text>
          ) : null}
          {sticker.english ? <Text style={styles.english}>{sticker.english}</Text> : null}
          <Pill
            label={sticker.category || 'other'}
            emoji={categoryStyle.emoji}
            color={categoryStyle.color}
            style={styles.pill}
          />
        </View>

        <GradientButton
          label="Listen to pronunciation"
          icon="volume-medium"
          onPress={speakWord}
          size="lg"
          style={styles.listenButton}
        />

        {details.length > 0 ? (
          <Card style={styles.detailsCard}>
            {details.map((detail, index) => (
              <View
                key={detail.label}
                style={[styles.detailRow, index === details.length - 1 && styles.detailRowLast]}
              >
                <Text style={styles.detailLabel}>{detail.label}</Text>
                <Text style={styles.detailValue}>{detail.value}</Text>
              </View>
            ))}
          </Card>
        ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    padding: 9,
    ...SHADOW.soft,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  imageFrame: {
    width: 216,
    height: 216,
    borderRadius: RADIUS.xl,
    padding: 5,
    marginBottom: 22,
    ...SHADOW.glow,
  },
  imageInner: {
    flex: 1,
    borderRadius: RADIUS.xl - 4,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 60,
  },
  wordSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  word: {
    fontSize: 33,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  pronunciation: {
    fontSize: 17,
    color: COLORS.textLight,
    marginTop: 5,
  },
  english: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  pill: {
    marginTop: 11,
  },
  listenButton: {
    width: '100%',
    marginBottom: 22,
  },
  detailsCard: {
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
});
