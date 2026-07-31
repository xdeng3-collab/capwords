import React, { useState, useCallback } from 'react';
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
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS, SHADOW, getCategoryStyle } from '../config';
import { PixelPanel, EmptyState, ProgressBar } from '../components/UI';
import PixelIcon from '../components/PixelIcon';
import {
  getStickersByDate,
  getStreak,
  getDailyWordCount,
  getUserProfile,
} from '../services/storageService';
import { format, parseISO, isToday, isYesterday } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const H_PADDING = 18;
const STICKER_SIZE = (SCREEN_WIDTH - H_PADDING * 2 - GRID_GAP * 2) / 3;

function formatDateLabel(dateString) {
  const date = parseISO(dateString);
  if (isToday(date)) return 'TODAY';
  if (isYesterday(date)) return 'YESTERDAY';
  return format(date, 'MMM d, yyyy').toUpperCase();
}

export default function CollectionScreen({ navigation }) {
  const [stickerGroups, setStickerGroups] = useState([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(5);
  const [totalWords, setTotalWords] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [groups, streakData, daily, profile] = await Promise.all([
      getStickersByDate(),
      getStreak(),
      getDailyWordCount(),
      getUserProfile(),
    ]);

    setStickerGroups(groups);
    setStreak(streakData);
    setDailyCount(daily);
    setDailyGoal(profile.dailyGoal);
    setTotalWords(groups.reduce((sum, group) => sum + group.items.length, 0));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const speakWord = (word, language) => {
    Haptics.selectionAsync().catch(() => {});
    Speech.speak(word, { language, rate: 0.8 });
  };

  const goalReached = dailyGoal > 0 && dailyCount >= dailyGoal;
  const progress = dailyGoal > 0 ? dailyCount / dailyGoal : 0;

  const renderSticker = ({ item }) => {
    const categoryStyle = getCategoryStyle(item.category);
    return (
      <TouchableOpacity
        style={styles.stickerItem}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('StickerDetail', { sticker: item })}
      >
        <View style={styles.stickerImageWrap}>
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.stickerImage} />
          ) : (
            <View style={[styles.stickerFallback, { backgroundColor: `${categoryStyle.color}33` }]}>
              <PixelIcon name={categoryStyle.icon} size={26} color={categoryStyle.color} />
            </View>
          )}

          <TouchableOpacity
            style={styles.miniSpeakButton}
            onPress={() => speakWord(item.word, item.language)}
            hitSlop={8}
          >
            <PixelIcon name="sound" size={12} color={COLORS.primaryDark} />
          </TouchableOpacity>
        </View>

        <Text style={styles.stickerWord} numberOfLines={1}>
          {item.word}
        </Text>
        {item.english ? (
          <Text style={styles.stickerEnglish} numberOfLines={1}>
            {item.english}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderDateGroup = ({ item }) => (
    <View style={styles.dateGroup}>
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>{formatDateLabel(item.date)}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {item.items.length} {item.items.length === 1 ? 'WORD' : 'WORDS'}
          </Text>
        </View>
      </View>
      <FlatList
        data={item.items}
        renderItem={renderSticker}
        keyExtractor={(sticker) => sticker.id}
        numColumns={3}
        scrollEnabled={false}
        columnWrapperStyle={styles.gridRow}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>STICKER BOOK</Text>
            <Text style={styles.subGreeting}>
              {totalWords > 0
                ? `${totalWords} ${totalWords === 1 ? 'WORD' : 'WORDS'} COLLECTED`
                : 'START YOUR COLLECTION TODAY'}
            </Text>
          </View>

          <View style={styles.streakChip}>
            <PixelIcon name="flame" size={16} color={COLORS.streak} light={COLORS.sun} />
            <Text style={styles.streakNumber}>{streak.current}</Text>
          </View>
        </View>

        <PixelPanel tone="alt" style={styles.progressCard}>
          <View style={styles.progressTop}>
            <Text style={styles.progressLabel}>
              {goalReached ? 'GOAL COMPLETE!' : "TODAY'S PROGRESS"}
            </Text>
            <Text style={styles.progressCount}>
              {dailyCount}/{dailyGoal}
            </Text>
          </View>
          <ProgressBar progress={progress} color={goalReached ? COLORS.leaf : COLORS.sun} />
        </PixelPanel>
      </View>

      {stickerGroups.length === 0 ? (
        <EmptyState
          mood="sleepy"
          title="NO STICKERS YET"
          subtitle="Snap a photo of anything around you and turn it into your first pixel sticker."
        />
      ) : (
        <FlatList
          data={stickerGroups}
          renderItem={renderDateGroup}
          keyExtractor={(group) => group.date}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
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
    paddingTop: 60,
    paddingHorizontal: H_PADDING,
    paddingBottom: 16,
    backgroundColor: COLORS.panel,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.outline,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1.5,
  },
  subGreeting: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
    gap: 5,
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
  },
  progressCard: {
    marginTop: 16,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 0.8,
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  listContent: {
    padding: H_PADDING,
    paddingBottom: 120,
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
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
  },
  countText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  stickerItem: {
    width: STICKER_SIZE,
    alignItems: 'center',
  },
  stickerImageWrap: {
    width: STICKER_SIZE,
    height: STICKER_SIZE,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  stickerImage: {
    width: '100%',
    height: '100%',
  },
  stickerFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniSpeakButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
    padding: 3,
  },
  stickerWord: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 8,
    textAlign: 'center',
  },
  stickerEnglish: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
    textAlign: 'center',
    fontWeight: '700',
  },
});
