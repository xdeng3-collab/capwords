import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COINS, JOURNEY, PET_MOODS, ROUTES, TABS } from '../../config';
import { COLORS, RADIUS, SHADOW } from '../../theme';
import { PixelIcon, TabIcon } from '../../components';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useSession } from '../../hooks/useSession';
import { describeCheers, getNewCheers, markCheersSeen } from '../../services/friendService';
import { getPetState } from '../../services/petService';
import { getDueCount } from '../../services/reviewService';
import {
  currentIsland,
  getJourneyState,
  haloDaysLeft,
  landOnIsland,
} from '../../services/progressService';
import { fitGoalToPlan } from '../../services/subscriptionService';
import { claimDailyGift, isDailyGiftAvailable } from '../../services/walletService';
import { successFeedback } from '../../utils/haptics';
import CheerToast from './journey/CheerToast';
import DailyGiftModal from './journey/DailyGiftModal';
import MilestoneModal from './journey/MilestoneModal';
import { StatsRow, ZoneBanner } from './journey/HomeHeader';
import SeaMap from './journey/SeaMap';
import { zoneOf } from './journey/seaArt';

/**
 * Home: the stats row up top, and the map the buddy hops across - one island
 * for every day the goal was met, through places around the world. The daily
 * gift pops up on the first visit of the day; a freshly earned island plays
 * its jump once the gift is out of the way, and a milestone island ends with
 * its halo celebration.
 */
export default function PetScreen({ navigation }) {
  const [state, setState] = useState(null);
  const [journey, setJourney] = useState(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [jumpTo, setJumpTo] = useState(null);
  const [cheerMessage, setCheerMessage] = useState(null);
  const [milestone, setMilestone] = useState(null); // { island, coins }
  const { user } = useSession();
  const reduceMotion = useReduceMotion();
  const [dueCount, setDueCount] = useState(0);

  const startJumpIfOwed = useCallback((j) => {
    if (j && j.reached > j.landed) setJumpTo(j.reached);
  }, []);

  const load = useCallback(async () => {
    // A goal the plan cannot reach would leave the island out of reach forever.
    await fitGoalToPlan();
    const [petState, j, gift] = await Promise.all([
      getPetState(),
      getJourneyState(),
      isDailyGiftAvailable(),
    ]);
    setState(petState);
    setJourney(j);
    getDueCount()
      .then(setDueCount)
      .catch(() => {});
    if (gift) setGiftOpen(true);
    else startJumpIfOwed(j);

    // Cheers from pals since this phone last showed one. Marked seen as soon
    // as they are queued, so a quick tab switch does not repeat them.
    if (user) {
      const cheers = await getNewCheers();
      if (cheers.length) {
        setCheerMessage(describeCheers(cheers));
        markCheersSeen(cheers);
      }
    }
  }, [startJumpIfOwed, user]);

  const hideCheer = useCallback(() => setCheerMessage(null), []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const collectGift = async () => {
    const result = await claimDailyGift();
    if (result.claimed) {
      successFeedback();
      setState((s) => (s ? { ...s, coins: result.coins.balance } : s));
    }
  };

  const closeGift = () => {
    setGiftOpen(false);
    startJumpIfOwed(journey);
  };

  const jumpDone = async () => {
    const landed = await landOnIsland(jumpTo);
    setJourney(landed);
    setJumpTo(null);
    if (landed.milestone) {
      setMilestone({ island: landed.milestone, coins: landed.coinsEarned });
      setState((s) => (s ? { ...s, coins: s.coins + landed.coinsEarned } : s));
    }
  };

  if (!state || !journey) {
    return <View style={styles.container} />;
  }

  const mood = PET_MOODS[state.mood] || PET_MOODS.neutral;
  // While a jump is owed the buddy waits on the island before the new one.
  const petIsland = currentIsland(journey);
  const haloDays = haloDaysLeft(journey);
  const place = zoneOf(petIsland);
  const guideIsNew = journey.seenPlace !== place.key;
  const pet = { species: state.species, mood: state.mood, outfit: state.equippedOutfit };

  return (
    <View style={[styles.container, { backgroundColor: zoneOf(journey.reached).water }]}>
      <View style={styles.header}>
        <StatsRow
          streak={state.streak}
          streakLitToday={state.goalReached}
          coins={state.coins}
          wordsToday={state.wordsToday}
          dailyGoal={state.dailyGoal}
        />
      </View>

      <View style={styles.sea}>
        <SeaMap
          petIsland={petIsland}
          reached={journey.reached}
          jumpTo={jumpTo}
          onJumpDone={jumpDone}
          goalMet={state.goalReached}
          wordsToday={state.wordsToday}
          dailyGoal={state.dailyGoal}
          pet={pet}
          speech={mood.line}
          onSnap={() => navigation.navigate(TABS.CAMERA)}
          halo={haloDays > 0}
          reduceMotion={reduceMotion}
        />
        <View style={styles.bannerWrap} pointerEvents="none">
          <ZoneBanner reached={journey.reached} haloDays={haloDays} />
        </View>
        <TouchableOpacity
          style={[styles.sideButton, styles.guide]}
          activeOpacity={0.85}
          accessibilityLabel={`Travel guide: ${place.name}`}
          onPress={() => navigation.navigate(ROUTES.TRAVEL_GUIDE)}
        >
          <PixelIcon name="pin" size={33} color={COLORS.secondary} light={COLORS.surface} />
          {guideIsNew ? <View style={styles.newDot} /> : null}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sideButton, styles.review]}
          activeOpacity={0.85}
          accessibilityLabel={dueCount ? `Review ${dueCount} words` : 'Review'}
          onPress={() => navigation.navigate(ROUTES.REVIEW)}
        >
          <TabIcon name="book" size={26} />
          {dueCount > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{dueCount > 9 ? '9+' : dueCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sideButton}
          activeOpacity={0.85}
          accessibilityLabel="Wardrobe"
          onPress={() => navigation.navigate(ROUTES.WARDROBE)}
        >
          <PixelIcon name="shirt" size={22} color={COLORS.berry} />
        </TouchableOpacity>
      </View>

      {/* Wait for the gift and the jump, so it is not lost behind them */}
      {cheerMessage && !giftOpen && jumpTo == null && !milestone ? (
        <CheerToast
          message={cheerMessage}
          onHidden={hideCheer}
          onPress={() => {
            hideCheer();
            navigation.navigate(TABS.FRIENDS);
          }}
        />
      ) : null}

      <DailyGiftModal
        visible={giftOpen}
        amount={COINS.checkInBonus}
        buddyName={state.name}
        onCollect={collectGift}
        onClose={closeGift}
        reduceMotion={reduceMotion}
      />

      <MilestoneModal
        visible={milestone != null}
        island={milestone?.island}
        coins={milestone?.coins}
        haloDays={JOURNEY.haloDays}
        pet={pet}
        buddyName={state.name}
        onClose={() => setMilestone(null)}
        reduceMotion={reduceMotion}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 58,
    backgroundColor: COLORS.background,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.outline,
    zIndex: 2,
  },
  sea: { flex: 1 },
  bannerWrap: { position: 'absolute', top: 12, left: 0, right: 0 },
  sideButton: {
    position: 'absolute',
    right: 18,
    bottom: 112,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.xl,
    ...SHADOW.card,
  },
  // Stacked above the wardrobe: review, then the guide.
  review: { bottom: 112 + 52 + 12 },
  guide: { bottom: 112 + (52 + 12) * 2 },
  countBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 11, fontWeight: '900', color: COLORS.surface },
  newDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.secondary,
  },
});
