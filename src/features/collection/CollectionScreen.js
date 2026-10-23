import React, { useState, useCallback, useMemo } from 'react';
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
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { ROUTES } from '../../config';
import { COLORS, RADIUS, SHADOW, getCategoryStyle } from '../../theme';
import { EmptyState, PixelIcon, TabIcon } from '../../components';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { getStickersByDate } from '../../services/collectionService';
import { getStreak } from '../../services/progressService';
import { getDueCount } from '../../services/reviewService';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { speakWord } from '../../utils/audio';
import { todayKey } from '../../utils/date';
import { selectFeedback } from '../../utils/haptics';
import GlobeView from './globe/GlobeView';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_GAP = 12;
const H_PADDING = 18;
const STICKER_SIZE = (SCREEN_WIDTH - H_PADDING * 2 - GRID_GAP * 2) / 3;
// Opened, the globe runs from under the title down to the floating tab bar.
const GLOBE_OPEN_HEIGHT = Math.max(320, SCREEN_HEIGHT - 252);

function formatDateLabel(dateString) {
  const date = parseISO(dateString);
  if (isToday(date)) return 'TODAY';
  if (isYesterday(date)) return 'YESTERDAY';
  return format(date, 'MMM d, yyyy').toUpperCase();
}

export default function CollectionScreen({ navigation }) {
  const [stickerGroups, setStickerGroups] = useState([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [globeOpen, setGlobeOpen] = useState(false);
  const [dueCount, setDueCount] = useState(0);
  const reduceMotion = useReduceMotion();
  const isFocused = useIsFocused();

  const loadData = useCallback(async () => {
    const [groups, streakData, due] = await Promise.all([
      getStickersByDate(),
      getStreak(),
      getDueCount(),
    ]);
    setStickerGroups(groups);
    setStreak(streakData);
    setDueCount(due);
  }, []);

  // Newest first, which is what the globe flies to when it opens.
  const stickers = useMemo(() => stickerGroups.flatMap((group) => group.items), [stickerGroups]);
  const totalWords = stickers.length;

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

  const sayWord = (word, language) => {
    selectFeedback();
    speakWord(word, language);
  };

  const renderSticker = ({ item }) => {
    const categoryStyle = getCategoryStyle(item.category);
    return (
      <TouchableOpacity
        style={styles.stickerItem}
        activeOpacity={0.85}
        onPress={() => navigation.navigate(ROUTES.STICKER_DETAIL, { sticker: item })}
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
            onPress={() => sayWord(item.word, item.language)}
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
        {item.location?.place ? (
          <Text style={styles.stickerPlace} numberOfLines={1}>
            {item.location.place}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderDateGroup = ({ item }) => (
    <View style={styles.dateGroup}>
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>{formatDateLabel(item.date)}</Text>
        <Text style={styles.countText}>
          {item.items.length} {item.items.length === 1 ? 'word' : 'words'}
        </Text>
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

  // The streak moves on the day the goal is met, stamping lastActiveDate.
  const litToday = streak.lastActiveDate === todayKey();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>MY WORDS</Text>
            <Text style={styles.subGreeting}>
              {totalWords > 0
                ? `${totalWords} ${totalWords === 1 ? 'WORD' : 'WORDS'} COLLECTED`
                : 'START YOUR COLLECTION TODAY'}
            </Text>
          </View>

          {/* Lit only once today's goal is met, the same as on Home */}
          <View
            style={styles.streakChip}
            accessible
            accessibilityLabel={`${streak.current} day streak`}
          >
            <PixelIcon
              name="flame"
              size={16}
              color={litToday ? COLORS.streak : COLORS.textMuted}
              light={litToday ? COLORS.sun : COLORS.surfaceAlt}
            />
            <Text style={[styles.streakNumber, !litToday && styles.streakNumberUnlit]}>
              {streak.current}
            </Text>
          </View>
        </View>

        <View style={styles.globe}>
          <GlobeView
            stickers={stickers}
            width={SCREEN_WIDTH - H_PADDING * 2}
            openHeight={GLOBE_OPEN_HEIGHT}
            active={isFocused}
            onOpenChange={setGlobeOpen}
            reduceMotion={reduceMotion}
            onOpenSticker={(sticker) => navigation.navigate(ROUTES.STICKER_DETAIL, { sticker })}
          />
        </View>
      </View>

      {/* The opened globe takes the whole page; the book comes back when it closes. */}
      {globeOpen ? null : stickerGroups.length === 0 ? (
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
          ListHeaderComponent={
            dueCount > 0 ? (
              <TouchableOpacity
                style={styles.reviewBanner}
                activeOpacity={0.85}
                onPress={() => {
                  selectFeedback();
                  navigation.navigate(ROUTES.REVIEW);
                }}
              >
                <TabIcon name="book" size={26} />
                <Text style={styles.reviewText}>
                  {dueCount} {dueCount === 1 ? 'word' : 'words'} to review today
                </Text>
                <Text style={styles.reviewStart}>START</Text>
              </TouchableOpacity>
            ) : null
          }
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
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    ...SHADOW.card,
  },
  reviewText: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.text },
  reviewStart: { fontSize: 13, fontWeight: '900', color: COLORS.water, letterSpacing: 1 },
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
  streakNumberUnlit: { color: COLORS.textMuted },
  globe: {
    marginTop: 16,
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
  // Plain text: a bordered chip here looked like a button.
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
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
  stickerPlace: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
});
