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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  GRADIENTS,
  RADIUS,
  SHADOW,
  CELEBRATIONS,
  getCategoryStyle,
} from '../config';
import { GradientButton, Pill } from '../components/UI';
import Confetti from '../components/Confetti';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function StickerResultScreen({ route, navigation }) {
  const { sticker, recognition } = route.params;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [showConfetti, setShowConfetti] = useState(true);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  // Keeps a handle on the currently playing back player so we can release it.
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
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => setShowConfetti(false), 2600);
    return () => clearTimeout(timer);
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

  // Release audio resources when leaving the screen.
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
          'Microphone needed 🎙️',
          'Enable microphone access in Settings to practice your pronunciation.'
        );
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

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
      // `uri` is populated once the recorder has stopped.
      setRecordedUri(audioRecorder.uri);
    } catch (error) {
      console.error('Failed to stop recording', error);
    } finally {
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    }
  };

  const playRecording = () => {
    if (!recordedUri) return;
    try {
      // Release any previous player before creating a new one.
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
      <Confetti active={showConfetti} />

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
        hitSlop={10}
      >
        <Ionicons name="close" size={24} color={COLORS.textLight} />
      </TouchableOpacity>

      {/* Celebration banner */}
      <Animated.View style={[styles.celebration, { opacity: fadeAnim }]}>
        <Text style={styles.celebrationEmoji}>{celebration.emoji}</Text>
        <Text style={styles.celebrationText}>{celebration.text}</Text>
      </Animated.View>

      {/* Sticker */}
      <Animated.View
        style={[styles.stickerContainer, { transform: [{ scale: scaleAnim }] }]}
      >
        <LinearGradient
          colors={GRADIENTS.candy}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.stickerFrame}
        >
          <View style={styles.stickerInner}>
            {sticker.imageUri ? (
              <Image source={{ uri: sticker.imageUri }} style={styles.stickerImage} />
            ) : (
              <View style={styles.stickerFallback}>
                <Text style={styles.stickerFallbackEmoji}>{categoryStyle.emoji}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
        <View style={styles.sparkle}>
          <Text style={styles.sparkleText}>✨</Text>
        </View>
      </Animated.View>

      {/* Word info */}
      <Animated.View style={[styles.wordContainer, { opacity: fadeAnim }]}>
        <Text style={styles.wordText}>{recognition.word}</Text>
        {recognition.pronunciation ? (
          <Text style={styles.pronunciationText}>/{recognition.pronunciation}/</Text>
        ) : null}
        {recognition.english ? (
          <Text style={styles.englishText}>{recognition.english}</Text>
        ) : null}
        <Pill
          label={recognition.category || 'other'}
          emoji={categoryStyle.emoji}
          color={categoryStyle.color}
          style={styles.categoryPill}
        />
      </Animated.View>

      {/* Actions */}
      <Animated.View style={[styles.actionsContainer, { opacity: fadeAnim }]}>
        <GradientButton
          label={isPlaying ? 'Playing…' : 'Listen'}
          icon={isPlaying ? 'volume-high' : 'volume-medium-outline'}
          gradient={GRADIENTS.primary}
          onPress={speakWord}
          disabled={isPlaying}
          size="lg"
        />

        <TouchableOpacity
          onPressIn={startRecording}
          onPressOut={stopRecording}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={isRecording ? ['#FB7185', '#E11D48'] : GRADIENTS.sunset}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.recordButton, SHADOW.glow]}
          >
            <Animated.View style={{ transform: [{ scale: recordPulse }] }}>
              <Ionicons name={isRecording ? 'mic' : 'mic-outline'} size={22} color="#fff" />
            </Animated.View>
            <Text style={styles.recordText}>
              {isRecording ? 'Listening… release to stop' : 'Hold to practice'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {recordedUri ? (
          <GradientButton
            label="Play my voice"
            icon="play"
            gradient={GRADIENTS.mint}
            onPress={playRecording}
          />
        ) : null}
      </Animated.View>

      <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const STICKER_SIZE = SCREEN_WIDTH * 0.52;

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
    borderRadius: RADIUS.pill,
    padding: 8,
    zIndex: 10,
    ...SHADOW.soft,
  },
  celebration: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.pill,
    gap: 7,
    marginBottom: 6,
    ...SHADOW.soft,
  },
  celebrationEmoji: {
    fontSize: 17,
  },
  celebrationText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  stickerContainer: {
    marginTop: 18,
    marginBottom: 20,
  },
  stickerFrame: {
    width: STICKER_SIZE,
    height: STICKER_SIZE,
    borderRadius: RADIUS.xl,
    padding: 5,
    ...SHADOW.glow,
  },
  stickerInner: {
    flex: 1,
    borderRadius: RADIUS.xl - 4,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  stickerImage: {
    width: '100%',
    height: '100%',
  },
  stickerFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  stickerFallbackEmoji: {
    fontSize: 56,
  },
  sparkle: {
    position: 'absolute',
    top: -8,
    right: -6,
  },
  sparkleText: {
    fontSize: 30,
  },
  wordContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  wordText: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  pronunciationText: {
    fontSize: 17,
    color: COLORS.textLight,
    marginTop: 5,
  },
  englishText: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  categoryPill: {
    marginTop: 11,
  },
  actionsContainer: {
    width: '100%',
    paddingHorizontal: 28,
    gap: 12,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: RADIUS.pill,
    gap: 9,
  },
  recordText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  doneButton: {
    position: 'absolute',
    bottom: 42,
    paddingHorizontal: 36,
    paddingVertical: 12,
  },
  doneButtonText: {
    color: COLORS.textLight,
    fontSize: 15,
    fontWeight: '700',
  },
});
