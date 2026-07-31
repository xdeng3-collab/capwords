import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config';
import { getStickersByDate, getStreak, getDailyWordCount, getUserProfile } from '../services/storageService';
import { format, parseISO } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STICKER_SIZE = (SCREEN_WIDTH - 60) / 3;

export default function CollectionScreen({ navigation }) {
  const [stickerGroups, setStickerGroups] = useState([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(5);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const groups = await getStickersByDate();
    const streakData = await getStreak();
    const daily = await getDailyWordCount();
    const profile = await getUserProfile();
    
    setStickerGroups(groups);
    setStreak(streakData);
    setDailyCount(daily);
    setDailyGoal(profile.dailyGoal);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const speakWord = (word, language) => {
    Speech.speak(word, { language, rate: 0.8 });
  };

  const renderSticker = ({ item }) => (
    <TouchableOpacity 
      style={styles.stickerItem}
      onPress={() => navigation.navigate('StickerDetail', { sticker: item })}
    >
      <Image source={{ uri: item.imageUri }} style={styles.stickerImage} />
      <Text style={styles.stickerWord} numberOfLines={1}>{item.word}</Text>
      <TouchableOpacity 
        style={styles.miniSpeakButton}
        onPress={() => speakWord(item.word, item.language)}
      >
        <Ionicons name="volume-medium" size={14} color={COLORS.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderDateGroup = ({ item }) => (
    <View style={styles.dateGroup}>
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>
          {format(parseISO(item.date), 'MMMM d, yyyy')}
        </Text>
        <Text style={styles.countText}>{item.items.length} words</Text>
      </View>
      <FlatList
        data={item.items}
        renderItem={renderSticker}
        keyExtractor={(item) => item.id}
        numColumns={3}
        scrollEnabled={false}
        contentContainerStyle={styles.stickersGrid}
      />
    </View>
  );

  const progressPercent = Math.min(dailyCount / dailyGoal, 1);

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.header}>
        <Text style={styles.title}>My Collection</Text>
        
        {/* Streak & Progress */}
        <View style={styles.statsRow}>
          <View style={styles.streakCard}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakNumber}>{streak.current}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
          </View>
          
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>Today's Progress</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{dailyCount} / {dailyGoal} words</Text>
          </View>
        </View>
      </View>

      {/* Stickers List */}
      {stickerGroups.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="camera-outline" size={60} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No stickers yet!</Text>
          <Text style={styles.emptyText}>
            Take a photo of something to start your collection.
          </Text>
        </View>
      ) : (
        <FlatList
          data={stickerGroups}
          renderItem={renderDateGroup}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
    backgroundColor: COLORS.surface,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  streakCard: {
    backgroundColor: COLORS.streak + '15',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    width: 90,
  },
  streakIcon: {
    fontSize: 24,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.streak,
  },
  streakLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  progressCard: {
    flex: 1,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 16,
    padding: 14,
    justifyContent: 'center',
  },
  progressTitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  countText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  stickersGrid: {
    gap: 10,
  },
  stickerItem: {
    width: STICKER_SIZE,
    marginRight: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  stickerImage: {
    width: STICKER_SIZE,
    height: STICKER_SIZE,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  stickerWord: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 6,
    textAlign: 'center',
  },
  miniSpeakButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
});
