import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BATTLE, DICE_COMBOS, OUTFITS, ROUTES, TABS } from '../../config';
import { COLORS, RADIUS, SHADOW } from '../../theme';
import {
  PetSprite,
  PixelButton,
  PixelIcon,
  PixelPanel,
  PoopSprite,
  useAlert,
} from '../../components';
import {
  enterBattle,
  finishBattle,
  getBattleState,
  previewDamage,
  retryWithCoins,
  rollDice,
  scoreDice,
  throwDamage,
} from '../../services/battleService';
import { equipOutfit } from '../../services/petService';
import { refreshWidget } from '../../services/widgetService';
import { selectFeedback, successFeedback, tapFeedback, warningFeedback } from '../../utils/haptics';
import { outfitBonusLabels } from '../../utils/outfits';
import Arena from './Arena';
import Die from './Die';
import HealthBar from './HealthBar';
import ResultOverlay from './ResultOverlay';
import { biomeForLevel, effectFor } from './effects';

const ROLL_MS = 440;
const NO_HOLDS = Array(BATTLE.diceCount).fill(false);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Poop Battle. One screen, two faces: the lobby (who is next, what it costs,
 * what there is to win) and the fight itself.
 *
 * A fight is a loop of turns: five dice are rolled, the player keeps some and
 * rerolls the rest, then throws - one poop, for the hand's damage. A monster
 * left standing hits back. The level is lost when the buddy's health or the
 * poops run out. All the numbers come from battleService; this file only
 * sequences them and the animations.
 */
export default function BattleScreen({ navigation }) {
  const showAlert = useAlert();
  const arena = useRef(null);
  const alive = useRef(true);
  const rollTimer = useRef(null);

  const [state, setState] = useState(null);
  const [phase, setPhase] = useState('lobby'); // lobby | fight | won | lost
  const [fightId, setFightId] = useState(0); // remounts the arena for a fresh fight
  const [fight, setFight] = useState(null);
  const [dice, setDice] = useState([]);
  const [held, setHeld] = useState(NO_HOLDS);
  const [rerollsLeft, setRerollsLeft] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    const next = await getBattleState();
    if (alive.current) setState(next);
    return next;
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Coming back from the Wardrobe mid-lobby should show the new outfit.
      load();
    }, [load])
  );

  useEffect(
    () => () => {
      alive.current = false;
      clearInterval(rollTimer.current);
    },
    []
  );

  // ==================== Dice ====================

  /** Rattle the dice that are not kept, then land them on a real roll. */
  const roll = useCallback((current, keep) => {
    setRolling(true);
    selectFeedback();
    clearInterval(rollTimer.current);
    setDice(rollDice(current, keep));
    rollTimer.current = setInterval(() => setDice(rollDice(current, keep)), 70);
    return wait(ROLL_MS).then(() => {
      clearInterval(rollTimer.current);
      if (!alive.current) return;
      setDice(rollDice(current, keep));
      setRolling(false);
      tapFeedback();
    });
  }, []);

  const startTurn = useCallback(
    (stats) => {
      setHeld(NO_HOLDS);
      setRerollsLeft(stats.rerolls);
      return roll([], NO_HOLDS);
    },
    [roll]
  );

  // ==================== Fight ====================

  const startFight = async () => {
    const entry = await enterBattle();
    if (!entry.ok) {
      load();
      return;
    }
    const fresh = await load();
    setFight({
      level: entry.level,
      stats: fresh.stats,
      pet: fresh.pet,
      monsterHealth: entry.level.monster.health,
      health: fresh.stats.health,
      throwsLeft: entry.level.ammoCost,
    });
    setFightId((id) => id + 1);
    setResult(null);
    setBusy(false);
    setPhase('fight');
    startTurn(fresh.stats);
  };

  const settle = async (won, reason) => {
    const outcome = await finishBattle(won);
    if (!alive.current) return;
    if (won) successFeedback();
    else warningFeedback();
    setResult({ ...outcome, reason });
    setPhase(won ? 'won' : 'lost');
    await load();
    refreshWidget();
  };

  const handleThrow = async () => {
    if (busy || rolling || !fight) return;
    setBusy(true);
    const thrown = throwDamage(dice, fight.stats);
    const throwsLeft = fight.throwsLeft - 1;
    const monsterHealth = Math.max(fight.monsterHealth - thrown.damage, 0);
    setFight((f) => ({ ...f, throwsLeft }));

    await arena.current?.throwPoop(thrown);
    if (!alive.current) return;
    setFight((f) => ({ ...f, monsterHealth }));

    if (monsterHealth === 0) {
      await arena.current?.defeatMonster();
      await settle(true);
      return;
    }
    if (throwsLeft === 0) {
      await wait(500);
      await settle(false, 'ammo');
      return;
    }

    await wait(250);
    await arena.current?.monsterAttack(fight.level.monster.attack);
    if (!alive.current) return;
    const health = Math.max(fight.health - fight.level.monster.attack, 0);
    setFight((f) => ({ ...f, health }));
    if (health === 0) {
      await wait(450);
      await settle(false, 'health');
      return;
    }

    await startTurn(fight.stats);
    if (alive.current) setBusy(false);
  };

  const handleReroll = () => {
    if (busy || rolling || rerollsLeft <= 0 || held.every(Boolean)) return;
    setRerollsLeft((n) => n - 1);
    roll(dice, held);
  };

  const toggleHold = (index) => {
    if (busy || rolling || rerollsLeft <= 0) return;
    selectFeedback();
    setHeld((h) => h.map((value, i) => (i === index ? !value : value)));
  };

  const handleFlee = () => {
    if (busy) return;
    showAlert(
      'Run away?',
      `The ${fight.level.monster.name} wins this round. You can come back with more poops, or pay coins to retry.`,
      [
        { text: 'Keep fighting', style: 'cancel' },
        { text: 'Run away', onPress: () => settle(false, 'fled') },
      ]
    );
  };

  // Leaving the screen mid-fight is the same as running away.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (phase !== 'fight') return;
        event.preventDefault();
        handleFlee();
      }),
    // handleFlee closes over the current fight, so re-subscribe as it changes.
    [navigation, phase, fight, busy]
  );

  // ==================== After the fight ====================

  const backToLobby = () => {
    setPhase('lobby');
    setFight(null);
    setResult(null);
  };

  const handleRetry = async () => {
    // Unlimited poops: walking back in is free, so no coins change hands.
    if (state.unlimitedAmmo) {
      startFight();
      return;
    }
    const retry = await retryWithCoins();
    if (!retry.ok) {
      showAlert(
        'Not enough coins',
        `A retry costs ${retry.level.retryCoins} coins. Learn a few words, or come back with ${retry.level.ammoCost} poops.`
      );
      load();
      return;
    }
    startFight();
  };

  const handleWear = async (outfitId) => {
    await equipOutfit(outfitId);
    refreshWidget();
    await load();
    backToLobby();
  };

  if (!state) return <View style={styles.container} />;

  // ==================== Fight view ====================

  if (phase !== 'lobby' && fight) {
    const { level, stats, pet } = fight;
    const hand = dice.length ? scoreDice(dice) : null;
    const canAct = phase === 'fight' && !busy && !rolling;
    const petMood = phase === 'won' ? 'happy' : phase === 'lost' ? 'sad' : 'content';

    return (
      <View style={styles.container}>
        <View style={styles.fight}>
          <View style={styles.fightBar}>
            <TouchableOpacity style={styles.backBtn} onPress={handleFlee} disabled={!canAct}>
              <PixelIcon name="close" size={14} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.fightLevel}>LEVEL {level.level}</Text>
            <View style={styles.throwsLeft}>
              {Array.from({ length: level.ammoCost }).map((_, i) => (
                <PoopSprite key={i} pixelSize={1.5} empty={i >= fight.throwsLeft} />
              ))}
            </View>
          </View>

          <View style={styles.monsterHud}>
            <View style={styles.hudRow}>
              {level.boss ? (
                <View style={styles.bossTag}>
                  <Text style={styles.bossTagText}>BOSS</Text>
                </View>
              ) : null}
              <Text style={styles.monsterName} numberOfLines={1}>
                {level.monster.name.toUpperCase()}
              </Text>
              <PixelIcon name="sword" size={12} color={COLORS.danger} />
              <Text style={styles.monsterAttack}>{level.monster.attack}</Text>
            </View>
            <HealthBar value={fight.monsterHealth} max={level.monster.health} color={COLORS.danger} />
          </View>

          <Arena
            key={fightId}
            ref={arena}
            style={styles.fightArena}
            level={level.level}
            monster={level.monster}
            boss={level.boss}
            species={pet.species}
            outfit={pet.outfit}
            effect={stats.effect}
            petMood={petMood}
          />

          <View style={styles.playerHud}>
            <Text style={styles.playerName} numberOfLines={1}>
              {pet.name.toUpperCase()}
            </Text>
            <View style={styles.playerBar}>
              <HealthBar value={fight.health} max={stats.health} color={COLORS.leaf} />
            </View>
          </View>

          <View style={styles.handRow}>
            {hand && !rolling ? (
              <>
                <Text style={styles.handName}>
                  {hand.combo.name.toUpperCase()} x{hand.combo.multiplier}
                </Text>
                <Text style={styles.handDamage}>{previewDamage(dice, stats)} DMG</Text>
              </>
            ) : (
              <Text style={styles.handName}>ROLLING...</Text>
            )}
          </View>

          <View style={styles.diceRow}>
            {dice.map((value, i) => (
              <Die
                key={i}
                value={value}
                held={held[i]}
                rolling={rolling}
                disabled={!canAct || rerollsLeft <= 0}
                onPress={() => toggleHold(i)}
              />
            ))}
          </View>
          <Text style={styles.diceHint}>
            {rerollsLeft > 0 ? 'Tap dice to keep them, then reroll the rest' : 'No rerolls left - throw it!'}
          </Text>

          <View style={styles.actions}>
            <PixelButton
              label={`Reroll ${rerollsLeft}`}
              icon="dice"
              color={COLORS.water}
              style={styles.rerollBtn}
              disabled={!canAct || rerollsLeft <= 0 || held.every(Boolean)}
              onPress={handleReroll}
            />
            <PixelButton
              label="Throw!"
              icon="bolt"
              color={COLORS.secondary}
              size="lg"
              style={styles.throwBtn}
              disabled={!canAct}
              onPress={handleThrow}
            />
          </View>
        </View>

        {phase !== 'fight' && result ? (
          <ResultOverlay
            result={result}
            level={level}
            pet={pet}
            coins={state.coins}
            nextLevel={state.level}
            freeRetry={state.unlimitedAmmo}
            onRetry={handleRetry}
            onWear={handleWear}
            onLobby={backToLobby}
          />
        ) : null}
      </View>
    );
  }

  // ==================== Lobby ====================

  const { level } = state;
  const biome = biomeForLevel(level.level, BATTLE.bossEvery);
  const outfit = OUTFITS.find((o) => o.id === state.pet.outfit);
  const bonuses = outfitBonusLabels(outfit);
  const effectLabel = effectFor(state.stats.effect).label;
  const missing = Math.max(level.ammoCost - state.ammo, 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <PixelIcon name="arrowLeft" size={16} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>POOP BATTLE</Text>
          <View style={styles.chip}>
            <PixelIcon name="coin" size={14} color={COLORS.sun} light={COLORS.surface} />
            <Text style={styles.chipText}>{state.coins}</Text>
          </View>
        </View>

        {/* Who is next */}
        <View style={styles.levelHeader}>
          <Text style={styles.levelNumber}>LEVEL {level.level}</Text>
          {level.boss ? (
            <View style={styles.bossTag}>
              <Text style={styles.bossTagText}>BOSS</Text>
            </View>
          ) : null}
          <Text style={styles.biomeName}>{biome.name.toUpperCase()}</Text>
        </View>
        <Arena
          key={`lobby-${level.level}-${state.pet.outfit}`}
          style={styles.lobbyArena}
          level={level.level}
          monster={level.monster}
          boss={level.boss}
          species={state.pet.species}
          outfit={state.pet.outfit}
          effect={state.stats.effect}
        />
        <PixelPanel style={styles.versus}>
          <Text style={styles.versusName}>{level.monster.name.toUpperCase()}</Text>
          <View style={styles.statRow}>
            <Stat icon="heart" color={COLORS.danger} value={level.monster.health} label="HEALTH" />
            <Stat icon="sword" color={COLORS.streak} value={level.monster.attack} label="HITS FOR" />
            <Stat icon="coin" color={COLORS.sun} value={`+${level.winCoins}`} label="REWARD" />
          </View>
        </PixelPanel>

        {/* Entry */}
        <PixelPanel style={styles.card}>
          <View style={styles.cardHeader}>
            <PoopSprite pixelSize={2} />
            <Text style={styles.cardTitle}>YOUR POOPS</Text>
            <Text style={styles.cardCount}>{state.unlimitedAmmo ? 'UNLIMITED' : state.ammo}</Text>
          </View>
          <Text style={styles.cardHint}>
            {state.unlimitedAmmo
              ? `Your promo code makes poops unlimited: every level is free to enter, with ${level.ammoCost} throws here.`
              : state.paid
              ? 'Your entry is already paid. The monster is waiting!'
              : missing
                ? `This level takes ${level.ammoCost} poops - one for every throw. Learn ${missing} more ${missing === 1 ? 'word' : 'words'} to stock up.`
                : `This level takes ${level.ammoCost} poops - one for every throw. Every word you learn drops one more.`}
          </Text>
          {state.canEnter ? (
            <PixelButton
              label={state.paid || state.unlimitedAmmo ? 'Fight!' : `Fight! (${level.ammoCost} poops)`}
              icon="sword"
              color={COLORS.secondary}
              size="lg"
              style={styles.cardBtn}
              onPress={startFight}
            />
          ) : (
            <PixelButton
              label={`Learn ${missing} more ${missing === 1 ? 'word' : 'words'}`}
              icon="camera"
              color={COLORS.leaf}
              size="lg"
              style={styles.cardBtn}
              onPress={() => navigation.navigate(TABS.CAMERA)}
            />
          )}
        </PixelPanel>

        {/* Loadout */}
        <PixelPanel style={styles.card}>
          <View style={styles.cardHeader}>
            <PixelIcon name="shirt" size={16} color={COLORS.berry} />
            <Text style={styles.cardTitle}>{state.pet.name.toUpperCase()}'S GEAR</Text>
            <TouchableOpacity onPress={() => navigation.navigate(ROUTES.WARDROBE)}>
              <Text style={styles.link}>CHANGE</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.gearName}>
            {outfit && outfit.id !== 'none' ? outfit.name : 'No outfit'}
          </Text>
          <View style={styles.tags}>
            <Tag label={`${state.stats.health} HP`} />
            <Tag label={`${state.stats.rerolls} REROLLS`} />
            {bonuses
              .filter((label) => !label.endsWith('HP') && !label.endsWith('REROLL'))
              .map((label) => (
                <Tag key={label} label={label} strong />
              ))}
            {effectLabel ? <Tag label={effectLabel.toUpperCase()} strong /> : null}
          </View>
        </PixelPanel>

        {/* What is ahead */}
        {state.nextReward ? (
          <PixelPanel style={[styles.card, styles.rewardCard]}>
            <PetSprite
              mood="happy"
              species={state.pet.species}
              outfit={state.nextReward.id}
              pixelSize={4}
              animate={false}
            />
            <View style={styles.rewardText}>
              <Text style={styles.rewardKicker}>CLEAR LEVEL {state.nextReward.level} TO WIN</Text>
              <Text style={styles.rewardName}>{state.nextReward.name.toUpperCase()}</Text>
              <View style={styles.tags}>
                {outfitBonusLabels(state.nextReward).map((label) => (
                  <Tag key={label} label={label} strong />
                ))}
              </View>
            </View>
          </PixelPanel>
        ) : null}

        {/* Rules */}
        <Text style={styles.sectionTitle}>HANDS</Text>
        <PixelPanel style={styles.card}>
          <Text style={styles.cardHint}>
            Damage is the sum of your five dice times the hand you make.
          </Text>
          <View style={styles.hands}>
            {DICE_COMBOS.map((combo) => (
              <View key={combo.id} style={styles.handLine}>
                <Text style={styles.handLineName}>{combo.name}</Text>
                <Text style={styles.handLineValue}>x{combo.multiplier}</Text>
              </View>
            ))}
          </View>
        </PixelPanel>
      </ScrollView>
    </View>
  );
}

function Stat({ icon, color, value, label }) {
  return (
    <View style={styles.stat}>
      <PixelIcon name={icon} size={16} color={color} light={COLORS.surface} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Tag({ label, strong }) {
  return (
    <View style={[styles.tag, strong && styles.tagStrong]}>
      <Text style={[styles.tagText, strong && styles.tagTextStrong]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: 18,
    paddingTop: 60,
    paddingBottom: 130,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backBtn: {
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    padding: 7,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: COLORS.surface,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  levelNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1.5,
  },
  biomeName: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 1,
  },
  bossTag: {
    backgroundColor: COLORS.danger,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  bossTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FBF3E0',
    letterSpacing: 1,
  },
  lobbyArena: {
    height: 200,
    ...SHADOW.card,
  },
  versus: {
    marginTop: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  versusName: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1,
    marginBottom: 10,
  },
  statRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 0.8,
    marginTop: 1,
  },
  card: {
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 1,
  },
  cardCount: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  cardHint: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '600',
    lineHeight: 18,
  },
  cardBtn: {
    marginTop: 12,
  },
  link: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 0.8,
    textDecorationLine: 'underline',
  },
  gearName: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderWidth: 2,
    borderColor: COLORS.outlineSoft,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: COLORS.surfaceAlt,
  },
  tagStrong: {
    borderColor: COLORS.outline,
    backgroundColor: COLORS.sun,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 0.5,
  },
  tagTextStrong: {
    color: COLORS.outline,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFF3C9',
  },
  rewardText: {
    flex: 1,
  },
  rewardKicker: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 0.8,
  },
  rewardName: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.8,
    marginTop: 2,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 1,
    marginBottom: 10,
  },
  hands: {
    marginTop: 8,
  },
  handLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.backgroundAlt,
  },
  handLineName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  handLineValue: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },

  // Fight
  fight: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 104, // clear of the floating tab bar
  },
  fightBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  fightLevel: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1.5,
  },
  throwsLeft: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 3,
  },
  monsterHud: {
    marginBottom: 8,
  },
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  monsterName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1,
  },
  monsterAttack: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.danger,
  },
  fightArena: {
    flex: 1,
    minHeight: 170,
  },
  playerHud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  playerName: {
    maxWidth: 110,
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1,
  },
  playerBar: {
    flex: 1,
  },
  handRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.outline,
    borderRadius: RADIUS.sm,
  },
  handName: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.sun,
    letterSpacing: 1,
  },
  handDamage: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FBF3E0',
    letterSpacing: 0.5,
  },
  diceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    minHeight: 70,
  },
  diceHint: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    alignItems: 'flex-end',
  },
  rerollBtn: {
    flex: 1,
  },
  throwBtn: {
    flex: 1.3,
  },
});
