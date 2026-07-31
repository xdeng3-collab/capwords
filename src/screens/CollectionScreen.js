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
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, RADIUS, SHADOW, getCategoryStyle } from '../config';
import { EmptyState, ProgressBar } from '../components/UI';
import {
  getStickersByDate,
  getStreak,
  getDailyWordCount,
  getUserProfile,
} from '../services/storageService';
import { format, parseISO, isToday, isYesterday } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const H_PADDING = 20;
const STICKER_SIZE = (SCREEN_WIDTH - H_PADDING * 2 - GRID_GAP * 2) / 3;

/** Human friendly date label: Today / Yesterday / Month d, yyyy */
function formatDateLabel(dateString) {
  const date = parseISO(dateString);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
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
            <View style={[styles.stickerFallback, { backgroundColor: `${categoryStyle.color}22` }]}>
              <Text style={styles.stickerFallbackEmoji}>{categoryStyle.emoji}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.miniSpeakButton}
            onPress={() => speakWord(item.word, item.language)}
            hitSlop={8}
          >
            <Ionicons name="volume-medium" size={13} color={COLORS.primary} />
          </TouchableOpacity>

          <View style={[styles.categoryDot, { backgroundColor: categoryStyle.color }]}>
            <Text style={styles.categoryDotEmoji}>{categoryStyle.emoji}</Text>
          </View>
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
            {item.items.length} {item.items.length === 1 ? 'word' : 'words'}
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
      <LinearGradient
        colors={GRADIENTS.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>My Sticker Book</Text>
            <Text style={styles.subGreeting}>
              {totalWords > 0
                ? `${totalWords} ${totalWords === 1 ? 'word' : 'words'} collected 🎨`
                : 'Your collection starts today ✨'}
            </Text>
          </View>

          <View style={styles.streakChip}>
            <Text style={styles.streakEmoji}>{streak.current > 0 ? '🔥' : '🌱'}</Text>
            <Text style={styles.streakNumber}>{streak.current}</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <Text style={styles.progressLabel}>
              {goalReached ? 'Daily goal complete! 🎉' : "Today's progress"}
            </Text>
            <Text style={styles.progressCount}>
              {dailyCount}/{dailyGoal}
            </Text>
          </View>
          <ProgressBar
            progress={progress}
            color={goalReached ? COLORS.mint : '#fff'}
            trackColor="rgba(255,255,255,0.3)"
            height={10}
          />
          {!goalReached ? (
            <Text style={styles.progressHint}>
              {Math.max(dailyGoal - dailyCount, 0)} more to keep your streak alive
            </Text>
          ) : (
            <Text style={styles.progressHint}>Amazing work — see you tomorrow!</Text>
          )}
        </View>
      </LinearGradient>

      {stickerGroups.length === 0 ? (
        <EmptyState
          emoji="📸"
          title="No stickers yet!"
          subtitle="Snap a photo of anything around you and we'll turn it into your first cute sticker."
        />
      ) : (
        <FlatList
          data={stickerGroups}
          renderItem={renderDateGroup}
          keyExtractor={(group) => group.date}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
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
    paddingTop: 62,
    paddingHorizontal: H_PADDING,
    paddingBottom: 22,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: 27,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  subGreeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 5,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.pill,
    gap: 5,
  },
  streakEmoji: {
    fontSize: 17,
  },
  streakNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  progressCard: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: RADIUS.md,
    padding: 15,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  progressHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
  },
  listContent: {
    padding: H_PADDING,
    paddingBottom: 120,
  },
  dateGroup: {
    marginBottom: 26,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dateText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  countBadge: {
    backgroundColor: `${COLORS.primary}14`,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
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
    overflow: 'visible',
    ...SHADOW.soft,
  },
  stickerImage: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.md,
  },
  stickerFallback: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerFallbackEmoji: {
    fontSize: 30,
  },
  miniSpeakButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#fff',
    borderRadius: RADIUS.pill,
    padding: 5,
    ...SHADOW.soft,
  },
  categoryDot: {
    position: 'absolute',
    bottom: -4,
    left: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  categoryDotEmoji: {
    fontSize: 10,
  },
  stickerWord: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 9,
    textAlign: 'center',
  },
  stickerEnglish: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
    textAlign: 'center',
  },
});
