import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useCameraPermissions } from 'expo-camera';
import {
  COLORS,
  LANGUAGES,
  PET,
  PET_SPECIES,
  RADIUS,
  SHADOW,
  MIN_DAILY_GOAL,
  MAX_DAILY_GOAL,
} from '../config';
import { PixelButton, ProgressBar } from '../components/UI';
import PixelIcon from '../components/PixelIcon';
import PetSprite, { tallestPetSpriteHeight } from '../components/PetSprite';
import { completeOnboarding } from '../services/storageService';
import { isSupabaseConfigured, restoreFromAccount } from '../services/accountService';
import AuthScreen from './AuthScreen';

// Welcome, the account offer, and the camera primer sit outside the meter:
// the four steps in between are the only decisions the app cannot start
// without. An account is deliberately not one of them - it is offered first,
// because signing in here saves answering the other four, but skipping it
// leads to exactly the same app.
const ALL_STEPS = ['welcome', 'account', 'language', 'buddy', 'name', 'goal', 'camera'];
// A build with no backend has no account to offer, so the step is dropped
// rather than shown with two buttons that can only fail.
const STEPS = ALL_STEPS.filter((s) => s !== 'account' || isSupabaseConfigured);
const METER_STEPS = 4;

// Species swap in place on the buddy step, and their ears are different
// heights. Reserve the tallest so the cards below never move.
const BUDDY_PIXEL = 14;
const BUDDY_HERO_HEIGHT = tallestPetSpriteHeight(BUDDY_PIXEL);
const SPECIES_PIXEL = 5;
const SPECIES_SPRITE_HEIGHT = tallestPetSpriteHeight(SPECIES_PIXEL);

// The eight offered up front; the rest are a tap away.
const FEATURED_LANGUAGES = ['zh', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'it'];

const SPECIES_LABELS = { cat: 'CAT', dog: 'DOG', bunny: 'BUNNY' };

const NAME_SUGGESTIONS = ['MOCHI', 'PIP', 'WAFFLE'];
// Drawn on "SURPRISE ME", so it is worth more than the three visible chips.
const SURPRISE_NAMES = [
  'Mochi',
  'Pip',
  'Waffle',
  'Biscuit',
  'Pixel',
  'Noodle',
  'Sprout',
  'Pebble',
  'Cocoa',
  'Tofu',
];

const GOAL_PRESETS = [
  { value: 3, label: 'Casual', note: 'A minute a day. The free tier limit.' },
  { value: 5, label: 'Steady', note: 'Recommended. About five minutes.' },
  { value: 10, label: 'Serious', note: 'For a real vocabulary push.' },
];

/** Segmented step meter, in the same style as the daily-goal bar. */
function StepMeter({ step }) {
  return (
    <ProgressBar
      progress={step / METER_STEPS}
      color={COLORS.primary}
      height={10}
      segments={METER_STEPS}
    />
  );
}

/** Back to the previous step. Absent on the welcome screen, which has none. */
function BackButton({ onPress, disabled }) {
  return (
    <TouchableOpacity
      style={styles.backButton}
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      activeOpacity={0.7}
    >
      <PixelIcon name="chevron" size={20} color={COLORS.textLight} style={styles.backIcon} />
    </TouchableOpacity>
  );
}

/**
 * A quiet text action.
 *
 * The rule is a border under the tap target rather than
 * `textDecorationLine: 'underline'`, which draws straight through descenders:
 * the 'y' of "Use my photo library" crossing it reads as a full stop.
 */
function LinkText({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={styles.link}
    >
      <Text style={styles.linkText}>{label}</Text>
    </TouchableOpacity>
  );
}

function StepHeader({ step, title, subtitle, onBack }) {
  return (
    <View style={styles.header}>
      <BackButton onPress={onBack} />
      <StepMeter step={step} />
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

/** The sticker the camera primer is selling: a framed apple, named. */
function StickerPreview() {
  const corners = [
    { top: 14, left: 14, h: true },
    { top: 14, left: 14, v: true },
    { top: 14, right: 14, h: true },
    { top: 14, right: 14, v: true },
    { bottom: 14, left: 14, h: true },
    { bottom: 14, left: 14, v: true },
    { bottom: 14, right: 14, h: true },
    { bottom: 14, right: 14, v: true },
  ];

  return (
    <View style={styles.stickerFrame}>
      {corners.map((c, i) => {
        const { h, v, ...pos } = c;
        return (
          <View
            key={i}
            style={[styles.frameCorner, pos, h ? styles.frameCornerH : styles.frameCornerV]}
          />
        );
      })}
      <View style={styles.apple} />
      <View style={styles.appleShine} />
      <View style={styles.appleStem} />
      <View style={styles.appleLeaf} />
      <Text style={styles.stickerWord}>MANZANA</Text>
    </View>
  );
}

/**
 * First-run setup. Asks for exactly the four things the app cannot start
 * without — language, species, name, daily goal — and ends on the camera
 * primer, because the first real action is a photo.
 *
 * The primer is also where the camera permission is decided: "ALLOW CAMERA"
 * asks now, while "Use my photo library instead" records the choice and asks
 * nothing. Library-only people are not prompted again until they reach for
 * the shutter themselves.
 */
export default function OnboardingScreen({ onDone }) {
  const [, requestCameraPermission] = useCameraPermissions();
  const [stepIndex, setStepIndex] = useState(0);
  const [language, setLanguage] = useState('es');
  const [species, setSpecies] = useState(PET.defaultSpecies);
  const [petName, setPetName] = useState('');
  const [dailyGoal, setDailyGoal] = useState(5);
  const [customGoal, setCustomGoal] = useState(false);
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const [saving, setSaving] = useState(false);
  // 'signin' | 'signup' while the auth sheet is up, null when it is not.
  const [authMode, setAuthMode] = useState(null);

  const step = STEPS[stepIndex];
  const next = () => {
    Haptics.selectionAsync().catch(() => {});
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };
  const back = () => {
    Haptics.selectionAsync().catch(() => {});
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  // Returns a press handler — the value is captured, not applied now.
  const pick = (setter, value) => () => {
    Haptics.selectionAsync().catch(() => {});
    setter(value);
  };

  const changeGoal = (value) => {
    const clamped = Math.min(Math.max(value, MIN_DAILY_GOAL), MAX_DAILY_GOAL);
    if (clamped !== dailyGoal) {
      Haptics.selectionAsync().catch(() => {});
      setDailyGoal(clamped);
    }
  };

  const surpriseMe = () => {
    Haptics.selectionAsync().catch(() => {});
    const pool = SURPRISE_NAMES.filter((n) => n.toLowerCase() !== petName.trim().toLowerCase());
    setPetName(pool[Math.floor(Math.random() * pool.length)]);
  };

  /**
   * Someone signed in on a fresh install. Their language, goal, and buddy are
   * already on the account, so asking them to pick a pet again would be rude:
   * pull it all down, mark setup done, and drop them straight into the app.
   *
   * If the restore fails (offline, say) they fall through to the normal four
   * questions rather than getting stuck on a spinner.
   */
  const finishFromAccount = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const restored = await restoreFromAccount();
      if (!restored.ok) {
        // Signed in, but the profile did not come down (offline, or the
        // migration has not been run yet). Carry on through normal setup
        // rather than dropping them back on the welcome screen with no
        // explanation — they are signed in either way, and finishing setup
        // pushes these answers up to the account.
        continueSetup();
        return;
      }
      await completeOnboarding({
        targetLanguage: restored.targetLanguage,
        species: restored.species,
        petName: restored.petName,
        dailyGoal: restored.dailyGoal,
        // Nothing has been asked about the camera yet, and the shutter asks
        // for itself the first time it is used.
        photoSource: 'camera',
      });
      onDone?.();
    } finally {
      setSaving(false);
    }
  };

  // Close the auth sheet and pick up at the first real question.
  const continueSetup = () => {
    setAuthMode(null);
    setStepIndex(STEPS.indexOf('language'));
  };

  /**
   * The auth sheet finished with a live session. Which of the two happened
   * matters: a brand new account has nothing on it but database defaults, so
   * restoring from it would silently choose their language and pet for them.
   * Only a returning sign-in is worth pulling down.
   */
  const handleAuthDone = (result) => {
    if (result?.signedUp) {
      continueSetup();
      return;
    }
    finishFromAccount();
  };

  // Everything the setup screens collected, written in one go.
  const finish = async (photoSource) => {
    if (saving) return;
    setSaving(true);
    try {
      await completeOnboarding({
        targetLanguage: language,
        species,
        petName: petName.trim() || PET.defaultName,
        dailyGoal,
        photoSource,
      });
      onDone?.();
    } finally {
      setSaving(false);
    }
  };

  // "ALLOW CAMERA" is the one place onboarding asks the system. Whatever the
  // answer, setup finishes — a "no" here just means the shutter will ask again
  // later, and the library still works.
  const allowCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const result = await requestCameraPermission();
    await finish(result?.granted ? 'camera' : 'library');
  };

  if (authMode) {
    return (
      <AuthScreen
        initialMode={authMode}
        onDone={handleAuthDone}
        onCancel={() => setAuthMode(null)}
      />
    );
  }

  if (step === 'welcome') {
    return (
      <View style={styles.screen}>
        <View style={styles.centeredBody}>
          <View style={styles.welcomeSprite}>
            <PetSprite mood="happy" species={species} pixelSize={13} />
          </View>
          <Text style={styles.welcomeTitle}>Snap a photo.{'\n'}Learn the word.</Text>
          <Text style={styles.welcomeBody}>
            Point your camera at anything around you. CapWords names it in the language you are
            learning and turns it into a sticker for your collection.
          </Text>
        </View>
        <View style={styles.footerSingle}>
          <PixelButton label="GET STARTED" onPress={next} size="lg" style={styles.footerButton} />
        </View>
      </View>
    );
  }

  // The account offer. It comes before the four questions because signing in
  // answers all of them, and it is skippable because none of the app needs it.
  if (step === 'account') {
    return (
      <View style={styles.screen}>
        <View style={styles.primerTop}>
          <BackButton onPress={back} disabled={saving} />
        </View>
        <View style={styles.centeredBody}>
          <View style={styles.accountSprite}>
            <PetSprite mood="content" species={species} pixelSize={11} />
          </View>
          <Text style={styles.accountTitle}>Bring your pals{'\n'}with you</Text>
          <Text style={styles.accountBody}>
            An account is how you add pals and how your progress finds you again on a new phone.
            Your words and photos stay on this phone either way.
          </Text>
        </View>
        <View style={styles.footer}>
          <PixelButton
            label="MAKE AN ACCOUNT"
            onPress={() => setAuthMode('signup')}
            disabled={saving}
            size="lg"
            style={styles.footerButton}
          />
          <PixelButton
            label="I ALREADY HAVE ONE"
            color={COLORS.primaryDark}
            onPress={() => setAuthMode('signin')}
            disabled={saving}
            size="lg"
            style={styles.footerButton}
          />
          <LinkText label="Not now — just let me in" onPress={next} disabled={saving} />
        </View>
      </View>
    );
  }

  if (step === 'language') {
    // Expanding shows the same full list as the in-app picker.
    const shown = showAllLanguages
      ? LANGUAGES
      : FEATURED_LANGUAGES.map((code) => LANGUAGES.find((l) => l.code === code)).filter(Boolean);

    return (
      <View style={styles.screen}>
        <StepHeader
          onBack={back}
          step={1}
          title={'WHAT ARE YOU\nLEARNING?'}
          subtitle="Pick one to start with. You can switch languages any time from your profile."
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.languageGrid}
          showsVerticalScrollIndicator={false}
        >
          {shown.map((lang) => {
            const active = lang.code === language;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.languageCard, active && styles.cardActive]}
                onPress={pick(setLanguage, lang.code)}
                activeOpacity={0.85}
              >
                <View style={[styles.langBadge, active && styles.langBadgeActive]}>
                  <Text style={[styles.langBadgeText, active && styles.langBadgeTextActive]}>
                    {lang.short}
                  </Text>
                </View>
                <Text style={[styles.langName, active && styles.textActive]} numberOfLines={1}>
                  {lang.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          {!showAllLanguages ? (
            <View style={styles.gridFullWidth}>
              <LinkText
                label={`See all ${LANGUAGES.length} languages`}
                onPress={() => setShowAllLanguages(true)}
              />
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.footerSingle}>
          <PixelButton label="CONTINUE" onPress={next} size="lg" style={styles.footerButton} />
        </View>
      </View>
    );
  }

  if (step === 'buddy') {
    return (
      <View style={styles.screen}>
        <StepHeader
          onBack={back}
          step={2}
          title="PICK A BUDDY"
          subtitle="Your buddy lives on the home screen and reacts to how much you learn. You can change whenever you want in the app."
        />
        <View style={styles.centeredBody}>
          <View style={styles.buddyHero}>
            <PetSprite mood="happy" species={species} pixelSize={BUDDY_PIXEL} />
          </View>
          <View style={styles.speciesRow}>
            {PET_SPECIES.map((s) => {
              const active = s.id === species;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.speciesCard, active && styles.cardActive]}
                  onPress={pick(setSpecies, s.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.speciesSprite}>
                    <PetSprite
                      mood="content"
                      species={s.id}
                      pixelSize={SPECIES_PIXEL}
                      animate={active}
                    />
                  </View>
                  <Text style={[styles.speciesLabel, active && styles.textActive]}>
                    {SPECIES_LABELS[s.id] || s.name.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={styles.footerSingle}>
          <PixelButton label="CONTINUE" onPress={next} size="lg" style={styles.footerButton} />
        </View>
      </View>
    );
  }

  if (step === 'name') {
    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StepHeader
          onBack={back}
          step={3}
          title="NAME YOUR BUDDY"
          subtitle={`${PET.maxNameLength} characters or fewer. You can rename them later from the pet screen.`}
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.centeredScroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>Hi! What should you call me?</Text>
          </View>
          <View style={styles.nameSprite}>
            <PetSprite mood="content" species={species} pixelSize={12} />
          </View>
          <View style={styles.nameField}>
            <TextInput
              style={styles.nameInput}
              value={petName}
              onChangeText={(t) => setPetName(t.slice(0, PET.maxNameLength))}
              placeholder={PET.defaultName}
              placeholderTextColor={COLORS.textMuted}
              maxLength={PET.maxNameLength}
              autoCorrect={false}
              returnKeyType="done"
            />
            <Text style={styles.nameCount}>
              {petName.length}/{PET.maxNameLength}
            </Text>
          </View>
          <View style={styles.chipRow}>
            {NAME_SUGGESTIONS.map((suggestion) => (
              <TouchableOpacity
                key={suggestion}
                style={styles.chip}
                onPress={pick(setPetName, suggestion)}
                activeOpacity={0.8}
              >
                <Text style={styles.chipText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.chip} onPress={surpriseMe} activeOpacity={0.8}>
              <Text style={styles.chipText}>SURPRISE ME</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <View style={styles.footerSingle}>
          <PixelButton label="CONTINUE" onPress={next} size="lg" style={styles.footerButton} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (step === 'goal') {
    return (
      <View style={styles.screen}>
        <StepHeader
          onBack={back}
          step={4}
          title={'HOW MANY WORDS\nA DAY?'}
          subtitle="Hit your goal to keep the streak alive and your buddy happy."
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.goalList}
          showsVerticalScrollIndicator={false}
        >
          {GOAL_PRESETS.map((preset) => {
            const active = !customGoal && dailyGoal === preset.value;
            return (
              <TouchableOpacity
                key={preset.value}
                style={[styles.goalCard, active && styles.cardActive]}
                onPress={() => {
                  setCustomGoal(false);
                  changeGoal(preset.value);
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.goalNumber, active && styles.textActive]}>
                  {preset.value}
                </Text>
                <View style={styles.goalCopy}>
                  <Text style={[styles.goalLabel, active && styles.textActive]}>
                    {preset.label}
                  </Text>
                  <Text style={[styles.goalNote, active && styles.textActiveSoft]}>
                    {preset.note}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.goalCardCustom, customGoal && styles.cardActive]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setCustomGoal(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.goalNumberCustom, customGoal && styles.textActive]}>
              {customGoal ? dailyGoal : '?'}
            </Text>
            <Text style={[styles.goalLabel, customGoal && styles.textActive]}>
              Set my own ({MIN_DAILY_GOAL}–{MAX_DAILY_GOAL})
            </Text>
          </TouchableOpacity>

          {customGoal ? (
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => changeGoal(dailyGoal - 1)}
                disabled={dailyGoal <= MIN_DAILY_GOAL}
              >
                <PixelIcon
                  name="minus"
                  size={20}
                  color={dailyGoal <= MIN_DAILY_GOAL ? COLORS.textMuted : COLORS.primaryDark}
                />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{dailyGoal}</Text>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => changeGoal(dailyGoal + 1)}
                disabled={dailyGoal >= MAX_DAILY_GOAL}
              >
                <PixelIcon
                  name="plus"
                  size={20}
                  color={dailyGoal >= MAX_DAILY_GOAL ? COLORS.textMuted : COLORS.primaryDark}
                />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.noteBox}>
            <View style={styles.noteDot} />
            <Text style={styles.noteText}>
              Your goal can only change once a week, so pick something you will still want on a
              bad day.
            </Text>
          </View>
        </ScrollView>
        <View style={styles.footerSingle}>
          <PixelButton label="CONTINUE" onPress={next} size="lg" style={styles.footerButton} />
        </View>
      </View>
    );
  }

  // Camera primer
  return (
    <View style={styles.screen}>
      <View style={styles.primerTop}>
        <BackButton onPress={back} disabled={saving} />
      </View>
      <View style={styles.centeredBody}>
        <StickerPreview />
        <Text style={styles.primerTitle}>CapWords needs your camera</Text>
        <Text style={styles.primerBody}>
          Photos are used once to identify the object. Only friends you add can see your
          collection.
        </Text>
      </View>
      <View style={styles.footer}>
        <PixelButton
          label="ALLOW CAMERA"
          color={COLORS.accent}
          onPress={allowCamera}
          disabled={saving}
          size="lg"
          style={styles.footerButton}
        />
        <LinkText
          label="Use my photo library instead"
          onPress={() => finish('library')}
          disabled={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, paddingTop: 60 },

  header: { paddingHorizontal: 24, paddingTop: 22, gap: 18 },
  backButton: {
    width: 36,
    height: 36,
    marginLeft: -8,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backIcon: { transform: [{ rotate: '180deg' }] },
  primerTop: { paddingHorizontal: 24, paddingTop: 22 },
  headerText: { gap: 8 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 26,
    letterSpacing: 1,
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    color: COLORS.textLight,
  },

  centeredBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    paddingHorizontal: 30,
  },
  // Same centring, but as scroll content: it grows to fill the frame and
  // scrolls instead of overlapping once the keyboard takes half the screen.
  centeredScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    paddingHorizontal: 30,
    paddingVertical: 16,
  },
  scroll: { flex: 1 },

  // The bottom padding clears the home indicator, which is about 34pt tall and
  // will happily swallow a tap meant for the link sitting above it.
  footer: { paddingHorizontal: 24, paddingBottom: 56, gap: 16, alignItems: 'center' },
  footerSingle: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 56 },
  footerButton: { width: '100%' },
  link: {
    alignSelf: 'center',
    paddingBottom: 3,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primaryDark,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
    textAlign: 'center',
  },

  // Shared "this one is picked" treatment: sage card, green outline.
  cardActive: {
    backgroundColor: '#E7F0E1',
    borderColor: COLORS.leafDark,
  },
  textActive: { color: '#3F6338' },
  textActiveSoft: { color: COLORS.leafDark },

  // 01 Welcome
  welcomeSprite: { marginBottom: 12 },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
    textAlign: 'center',
    letterSpacing: -0.6,
    color: COLORS.text,
  },
  welcomeBody: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
    color: COLORS.textLight,
  },

  // 03 Language
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  languageCard: {
    width: '47.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    padding: 12,
    ...SHADOW.soft,
  },
  langBadge: {
    width: 34,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundAlt,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
  },
  langBadgeActive: { backgroundColor: COLORS.leaf, borderColor: COLORS.leafDark },
  langBadgeText: { fontSize: 10, fontWeight: '900', color: COLORS.textLight },
  langBadgeTextActive: { color: COLORS.surface },
  langName: { flex: 1, fontSize: 15, fontWeight: '900', color: COLORS.text },
  gridFullWidth: { width: '100%', paddingTop: 6 },

  // 02b Account offer
  accountSprite: { marginBottom: 12 },
  accountTitle: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    textAlign: 'center',
    letterSpacing: -0.5,
    color: COLORS.text,
  },
  accountBody: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 23,
    textAlign: 'center',
    color: COLORS.textLight,
  },

  // 04 Buddy. The hero reserves the tallest species so the cards below it stay
  // put when you tap between cat, dog, and bunny; flex-end keeps every buddy
  // standing on the same ground line rather than centred in the gap.
  buddyHero: {
    height: BUDDY_HERO_HEIGHT,
    justifyContent: 'flex-end',
    marginBottom: 18,
  },
  speciesRow: { flexDirection: 'row', gap: 12, width: '100%' },
  speciesCard: {
    flex: 1,
    // Tall enough for the reserved sprite box plus its label, so the tallest
    // species is not clipped by the card it sits in.
    height: SPECIES_SPRITE_HEIGHT + 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    ...SHADOW.soft,
  },
  speciesSprite: {
    height: SPECIES_SPRITE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  speciesLabel: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: COLORS.textLight,
  },

  // 05 Name
  speechBubble: {
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...SHADOW.soft,
  },
  speechText: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  nameSprite: { marginVertical: 6 },
  nameField: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 16,
    ...SHADOW.soft,
  },
  nameInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
  },
  nameCount: { fontSize: 10, fontWeight: '900', color: COLORS.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(201,138,59,0.13)',
    borderRadius: RADIUS.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: COLORS.primaryDark,
  },

  // 06 Goal
  goalList: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 10, gap: 12 },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    padding: 16,
    ...SHADOW.soft,
  },
  goalCardCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: COLORS.textMuted,
    borderRadius: RADIUS.sm,
    padding: 16,
  },
  goalNumber: {
    width: 52,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
  },
  goalNumberCustom: {
    width: 52,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textMuted,
  },
  goalCopy: { flex: 1, gap: 2 },
  goalLabel: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  goalNote: { fontSize: 13, fontWeight: '600', color: COLORS.textLight },

  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  stepperButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    ...SHADOW.soft,
  },
  stepperValue: {
    minWidth: 56,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.text,
  },

  noteBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginTop: 8,
    backgroundColor: COLORS.backgroundAlt,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  noteDot: { width: 8, height: 8, backgroundColor: COLORS.primary, marginTop: 6 },
  noteText: { flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 19, color: COLORS.textLight },

  // 07 Camera primer
  stickerFrame: {
    width: 208,
    height: 208,
    backgroundColor: COLORS.backgroundAlt,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
    ...SHADOW.card,
  },
  frameCorner: { position: 'absolute', backgroundColor: COLORS.primary },
  frameCornerH: { width: 34, height: 6 },
  frameCornerV: { width: 6, height: 34 },
  apple: {
    position: 'absolute',
    left: 74,
    top: 62,
    width: 60,
    height: 54,
    backgroundColor: COLORS.secondary,
    borderWidth: 3,
    borderColor: COLORS.outline,
  },
  appleShine: {
    position: 'absolute',
    left: 86,
    top: 74,
    width: 10,
    height: 10,
    backgroundColor: '#F0A5A5',
  },
  appleStem: {
    position: 'absolute',
    left: 100,
    top: 48,
    width: 8,
    height: 16,
    backgroundColor: '#6E4128',
  },
  appleLeaf: {
    position: 'absolute',
    left: 108,
    top: 44,
    width: 16,
    height: 8,
    backgroundColor: COLORS.leaf,
  },
  stickerWord: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 34,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    color: COLORS.textLight,
  },
  primerTitle: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    textAlign: 'center',
    letterSpacing: -0.4,
    color: COLORS.text,
  },
  primerBody: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 23,
    textAlign: 'center',
    color: COLORS.textLight,
  },
});
