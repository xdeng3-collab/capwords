import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Easing,
  Alert,
} from 'react-native';
import {
  useAudioRecorder,
  createAudioPlayer,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
} from 'expo-audio';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { COLORS, RADIUS, SHADOW, CELEBRATIONS, getCategoryStyle } from '../config';
import { PixelButton } from '../components/UI';
import PixelIcon from '../components/PixelIcon';
import PetSprite from '../components/PetSprite';
import StreakCelebration from '../components/StreakCelebration';
import { getPet, awardPracticeBonus } from '../services/storageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STICKER_SIZE = SCREEN_WIDTH * 0.52;

export default function StickerResultScreen({ route, navigation }) {
  const { sticker, recognition, goalJustReached, streak } = route.params;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [celebrating, setCelebrating] = useState(!!goalJustReached);
  const [recordedUri, setRecordedUri] = useState(null);
  const [pet, setPet] = useState(null);
  const [practiceCoins, setPracticeCoins] = useState(0);

  useEffect(() => {
    getPet().then(setPet).catch(() => {});
  }, []);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const playerRef = useRef(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const recordPulse = useRef(new Animated.Value(1)).current;

  const celebration = useMemo(
    () => CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)],
    []
  );
  const categoryStyle = getCategoryStyle(recognition.category);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordPulse, {
            toValue: 1.25,
            duration: 600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(recordPulse, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      recordPulse.stopAnimation();
      recordPulse.setValue(1);
    }
  }, [isRecording, recordPulse]);

  useEffect(
    () => () => {
      Speech.stop();
      playerRef.current?.remove();
      playerRef.current = null;
    },
    []
  );

  const speakWord = () => {
    Haptics.selectionAsync().catch(() => {});
    setIsPlaying(true);
    Speech.speak(sticker.word || recognition.word, {
      language: sticker.language,
      rate: 0.8,
      onDone: () => setIsPlaying(false),
      onStopped: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  };

  const startRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(
          'Microphone needed',
          'Enable microphone access in Settings to practice your pronunciation.'
        );
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (error) {
      console.error('Failed to start recording', error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    try {
      await audioRecorder.stop();
      setRecordedUri(audioRecorder.uri);
      // Reward the first pronunciation practice of this word.
      const bonus = await awardPracticeBonus(sticker.id);
      if (bonus > 0) setPracticeCoins(bonus);
    } catch (error) {
      console.error('Failed to stop recording', error);
    } finally {
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    }
  };

  const playRecording = () => {
    if (!recordedUri) return;
    try {
      playerRef.current?.remove();
      const player = createAudioPlayer({ uri: recordedUri });
      playerRef.current = player;
      player.play();
    } catch (error) {
      console.error('Failed to play recording', error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()} hitSlop={10}>
        <PixelIcon name="close" size={18} color={COLORS.text} />
      </TouchableOpacity>

      {/* Celebration + happy pet */}
      <Animated.View style={[styles.celebrationRow, { opacity: fadeAnim }]}>
        <PetSprite
          mood="happy"
          species={pet?.species}
          outfit={pet?.equippedOutfit}
          pixelSize={5}
        />
        <View style={styles.celebrationBubble}>
          <Text style={styles.celebrationText}>{celebration}</Text>
        </View>
        {sticker.coinsEarned ? (
          <View style={styles.coinChip}>
            <PixelIcon name="coin" size={14} color="#B8860B" />
            <Text style={styles.coinChipText}>+{sticker.coinsEarned + practiceCoins}</Text>
          </View>
        ) : null}
      </Animated.View>

      {/* Sticker */}
      <Animated.View style={[styles.stickerContainer, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.stickerFrame}>
          {sticker.imageUri ? (
            <Image source={{ uri: sticker.imageUri }} style={styles.stickerImage} />
          ) : (
            <View style={styles.stickerFallback}>
              <PixelIcon name={categoryStyle.icon} size={64} color={categoryStyle.color} />
            </View>
          )}
        </View>
      </Animated.View>

      {/* Word info */}
      <Animated.View style={[styles.wordContainer, { opacity: fadeAnim }]}>
        <Text style={styles.wordText}>{recognition.word}</Text>
        {recognition.pronunciation ? (
          <Text style={styles.pronunciationText}>/{recognition.pronunciation}/</Text>
        ) : null}
        {recognition.english ? <Text style={styles.englishText}>{recognition.english}</Text> : null}
      </Animated.View>

      {/* Learn it: example sentence + fun fact */}
      {recognition.exampleSentence || recognition.funFact ? (
        <Animated.View style={[styles.learnCard, { opacity: fadeAnim }]}>
          {recognition.exampleSentence ? (
            <>
              <Text style={styles.learnSentence}>"{recognition.exampleSentence}"</Text>
              {recognition.sentenceTranslation ? (
                <Text style={styles.learnTranslation}>{recognition.sentenceTranslation}</Text>
              ) : null}
            </>
          ) : null}
          {recognition.funFact ? (
            <Text style={styles.learnFact}>★ {recognition.funFact}</Text>
          ) : null}
        </Animated.View>
      ) : null}

      {/* Actions */}
      <Animated.View style={[styles.actionsContainer, { opacity: fadeAnim }]}>
        <PixelButton
          label={isPlaying ? 'Playing...' : 'Listen'}
          icon="sound"
          color={COLORS.primary}
          onPress={speakWord}
          disabled={isPlaying}
          size="lg"
        />

        <TouchableOpacity onPressIn={startRecording} onPressOut={stopRecording} activeOpacity={0.9}>
          <View
            style={[
              styles.recordButton,
              { backgroundColor: isRecording ? COLORS.danger : COLORS.secondary },
              SHADOW.glow,
            ]}
          >
            <Animated.View style={{ transform: [{ scale: recordPulse }] }}>
              <PixelIcon name="mic" size={20} color="#FBF3E0" />
            </Animated.View>
            <Text style={styles.recordText}>
              {isRecording
                ? 'LISTENING... RELEASE TO STOP'
                : practiceCoins > 0
                  ? 'PRACTICED! +1 COIN'
                  : 'HOLD TO PRACTICE (+1 COIN)'}
            </Text>
          </View>
        </TouchableOpacity>

        {recordedUri ? (
          <PixelButton label="Play my voice" icon="play" color={COLORS.accent} onPress={playRecording} />
        ) : null}
      </Animated.View>

      <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
        <Text style={styles.doneButtonText}>DONE</Text>
      </TouchableOpacity>

      {celebrating ? (
        <StreakCelebration streak={streak} onDone={() => setCelebrating(false)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    paddingTop: 58,
  },
  closeButton: {
    position: 'absolute',
    top: 54,
    right: 18,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
    padding: 7,
    zIndex: 10,
  },
  celebrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  celebrationBubble: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  celebrationText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
  },
  coinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3C9',
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  coinChipText: { fontSize: 13, fontWeight: '900', color: '#B8860B' },
  stickerContainer: { marginTop: 8, marginBottom: 20 },
  stickerFrame: {
    width: STICKER_SIZE,
    height: STICKER_SIZE,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 4,
    borderColor: COLORS.outline,
    overflow: 'hidden',
    ...SHADOW.glow,
  },
  stickerImage: { width: '100%', height: '100%' },
  stickerFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  wordContainer: { alignItems: 'center', marginBottom: 24, paddingHorizontal: 24 },
  wordText: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  pronunciationText: { fontSize: 17, color: COLORS.textLight, marginTop: 5, fontWeight: '700' },
  englishText: { fontSize: 15, color: COLORS.textMuted, marginTop: 3, fontWeight: '700' },

  learnCard: {
    marginHorizontal: 28,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
    alignSelf: 'stretch',
  },
  learnSentence: { fontSize: 15, fontWeight: '800', color: COLORS.text, lineHeight: 21 },
  learnTranslation: { fontSize: 13, color: COLORS.textLight, fontWeight: '600', lineHeight: 18 },
  learnFact: { fontSize: 13, color: COLORS.primaryDark, fontWeight: '700', marginTop: 4, lineHeight: 18 },

  actionsContainer: { width: '100%', paddingHorizontal: 28, gap: 12 },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: RADIUS.md,
    borderWidth: 3,
    borderColor: COLORS.outline,
    gap: 9,
  },
  recordText: { color: '#FBF3E0', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  doneButton: { position: 'absolute', bottom: 42, paddingHorizontal: 36, paddingVertical: 12 },
  doneButtonText: { color: COLORS.textLight, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});
