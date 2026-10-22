import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COINS, PET_MOODS, ROUTES, TABS } from '../../config';
import { COLORS, RADIUS, SHADOW } from '../../theme';
import { PixelIcon } from '../../components';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useSession } from '../../hooks/useSession';
import { describeCheers, getNewCheers, markCheersSeen } from '../../services/friendService';
import { getPetState } from '../../services/petService';
import { getJourneyState, landOnIsland } from '../../services/progressService';
import { fitGoalToPlan } from '../../services/subscriptionService';
import { claimDailyGift, isDailyGiftAvailable } from '../../services/walletService';
import { successFeedback } from '../../utils/haptics';
import CheerToast from './journey/CheerToast';
import DailyGiftModal from './journey/DailyGiftModal';
import { StatsRow, ZoneBanner } from './journey/HomeHeader';
import SeaMap from './journey/SeaMap';
import { zoneOf } from './journey/seaArt';

/**
 * Home: the stats row up top, and the sea the buddy hops across - one island
 * for every day the goal was met. The daily gift pops up on the first visit of
 * the day; a freshly earned island plays its jump once the gift is out of the
 * way.
 */
export default function PetScreen({ navigation }) {
  const [state, setState] = useState(null);
  const [journey, setJourney] = useState(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [jumpTo, setJumpTo] = useState(null);
  const [cheerMessage, setCheerMessage] = useState(null);
  const { user } = useSession();
  const reduceMotion = useReduceMotion();

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
  };

  if (!state || !journey) {
    return <View style={styles.container} />;
  }

  const mood = PET_MOODS[state.mood] || PET_MOODS.neutral;
  // While a jump is owed the buddy waits on the island before the new one.
  const petIsland = journey.reached > journey.landed ? journey.reached - 1 : journey.reached;

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
          pet={{ species: state.species, mood: state.mood, outfit: state.equippedOutfit }}
          speech={mood.line}
          onSnap={() => navigation.navigate(TABS.CAMERA)}
          reduceMotion={reduceMotion}
        />
        <View style={styles.bannerWrap} pointerEvents="none">
          <ZoneBanner reached={journey.reached} />
        </View>
        <TouchableOpacity
          style={styles.wardrobe}
          activeOpacity={0.85}
          accessibilityLabel="Wardrobe"
          onPress={() => navigation.navigate(ROUTES.WARDROBE)}
        >
          <PixelIcon name="shirt" size={22} color={COLORS.berry} />
        </TouchableOpacity>
      </View>

      {/* Wait for the gift and the jump, so it is not lost behind them */}
      {cheerMessage && !giftOpen && jumpTo == null ? (
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
  wardrobe: {
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
});
