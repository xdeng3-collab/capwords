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
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config';

export default function StickerDetailScreen({ route, navigation }) {
  const { sticker } = route.params;

  const speakWord = () => {
    Speech.speak(sticker.word, { language: sticker.language, rate: 0.8 });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Sticker Detail</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Sticker Image */}
        <View style={styles.imageContainer}>
          {sticker.imageUri ? (
            <Image source={{ uri: sticker.imageUri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={48} color={COLORS.textMuted} />
            </View>
          )}
        </View>

        {/* Word Info */}
        <View style={styles.wordSection}>
          <Text style={styles.word}>{sticker.word}</Text>
          {sticker.pronunciation && (
            <Text style={styles.pronunciation}>/{sticker.pronunciation}/</Text>
          )}
          {sticker.english && (
            <Text style={styles.english}>{sticker.english}</Text>
          )}
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.listenButton} onPress={speakWord}>
          <Ionicons name="volume-medium" size={24} color="#fff" />
          <Text style={styles.listenButtonText}>Listen to Pronunciation</Text>
        </TouchableOpacity>

        {/* Details */}
        <View style={styles.detailsCard}>
          {sticker.category && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{sticker.category}</Text>
            </View>
          )}
          {sticker.language && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Language</Text>
              <Text style={styles.detailValue}>{sticker.language}</Text>
            </View>
          )}
          {sticker.createdAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Learned on</Text>
              <Text style={styles.detailValue}>
                {new Date(sticker.createdAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  imageContainer: {
    width: 200,
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  word: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  pronunciation: {
    fontSize: 18,
    color: COLORS.textLight,
    marginTop: 4,
  },
  english: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 10,
    marginBottom: 24,
    width: '100%',
    justifyContent: 'center',
  },
  listenButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
});
