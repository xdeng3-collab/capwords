import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
} from 'react-native';
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, LANGUAGES, RADIUS, SHADOW } from '../config';
import { PixelButton } from '../components/UI';
import { useAlert } from '../components/PixelAlert';
import PixelIcon from '../components/PixelIcon';
import PetSprite from '../components/PetSprite';
import PaywallModal from '../components/PaywallModal';
import { recognizeAndTranslate, RecognitionFailedError } from '../services/aiService';
import { refreshWidget } from '../services/widgetService';
import {
  saveSticker,
  getUserProfile,
  updateUserProfile,
  canLearnWord,
  consumeWord,
  getDailyWordCount,
  getPet,
  getStreak,
} from '../services/storageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_SIZE = SCREEN_WIDTH * 0.68;

/**
 * Best-effort capture of where the photo was taken. Returns
 * { latitude, longitude, place } or null if permission is denied or
 * anything fails — a missing location never blocks saving the word.
 */
async function captureLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const position =
      (await Location.getLastKnownPositionAsync()) ||
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
    if (!position) return null;
    const { latitude, longitude } = position.coords;
    let place = null;
    try {
      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo) {
        place = [geo.city || geo.subregion || geo.district, geo.region || geo.country]
          .filter(Boolean)
          .join(', ');
      }
    } catch (e) {
      // Reverse geocoding is optional; keep the raw coordinates.
    }
    return { latitude, longitude, place };
  } catch (e) {
    return null;
  }
}

export default function CameraScreen({ navigation }) {
  const showAlert = useAlert();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [wordsToday, setWordsToday] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(5);
  const [petName, setPetName] = useState('your buddy');
  const [pet, setPet] = useState(null);
  // The frozen photo shown while recognition runs.
  const [capturedUri, setCapturedUri] = useState(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [zoom, setZoom] = useState(0);
  const zoomStart = useRef(0);

  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shutterScale = useRef(new Animated.Value(1)).current;

  const loadProfile = useCallback(async () => {
    const [profile, count, pet] = await Promise.all([
      getUserProfile(),
      getDailyWordCount(),
      getPet(),
    ]);
    setTargetLanguage(profile.targetLanguage);
    setDailyGoal(profile.dailyGoal);
    setWordsToday(count);
    setPetName(pet.name);
    setPet(pet);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isProcessing, pulseAnim]);

  const promptUpgrade = () => setPaywallVisible(true);

  const goToPlans = () => {
    setPaywallVisible(false);
    // Subscription lives in the Profile tab's stack, so navigate through it.
    navigation.navigate('Profile', { screen: 'Subscription' });
  };

  const processImage = async ({ uri, base64 }) => {
    setIsProcessing(true);
    setCapturedUri(uri);
    try {
      const langName =
        LANGUAGES.find((l) => l.code === targetLanguage)?.name || targetLanguage;
      // Recognize the word and grab the location at the same time.
      const [recognition, location] = await Promise.all([
        recognizeAndTranslate(base64, langName),
        captureLocation(),
      ]);

      const sticker = await saveSticker({
        imageUri: uri,
        word: recognition.word,
        pronunciation: recognition.pronunciation,
        english: recognition.english,
        description: recognition.description,
        category: recognition.category,
        exampleSentence: recognition.exampleSentence,
        sentenceTranslation: recognition.sentenceTranslation,
        funFact: recognition.funFact,
        language: targetLanguage,
        location,
      });

      await consumeWord();
      await loadProfile();
      // New word, new streak, new buddy mood — push it to the home screen.
      refreshWidget();

      // Celebrate when this word is the one that completes the daily goal.
      const [profile, count, streakData] = await Promise.all([
        getUserProfile(),
        getDailyWordCount(),
        getStreak(),
      ]);
      const goalJustReached = count === profile.dailyGoal;

      navigation.navigate('StickerResult', {
        sticker,
        recognition,
        goalJustReached,
        streak: streakData.current,
      });
    } catch (error) {
      // Nothing was saved and consumeWord() never ran, so the user still has
      // the word. Say so plainly — a failed snap that silently costs a word is
      // the thing people notice and resent.
      console.error('Recognition failed', error);
      const couldNotSee = error instanceof RecognitionFailedError;
      showAlert(
        couldNotSee ? "Couldn't read that one" : 'Something went wrong',
        couldNotSee
          ? "We couldn't work out what's in the photo. Try getting closer, or finding better light.\n\nThis one is free — no word was used."
          : "We couldn't reach the word service. Check your connection and try again.\n\nThis one is free — no word was used."
      );
    } finally {
      setIsProcessing(false);
      setCapturedUri(null);
    }
  };

  const clampZoom = (z) => Math.min(Math.max(z, 0), 0.6);
  const nudgeZoom = (delta) => {
    Haptics.selectionAsync().catch(() => {});
    setZoom((z) => clampZoom(z + delta));
  };

  // Pinch anywhere on the viewfinder to zoom, like the native camera.
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      zoomStart.current = zoom;
    })
    .onUpdate((e) => {
      setZoom(clampZoom(zoomStart.current + (e.scale - 1) * 0.25));
    })
    .runOnJS(true);

  const takePicture = async () => {
    if (!cameraRef.current || isProcessing) return;

    const canLearn = await canLearnWord();
    if (!canLearn.allowed) {
      promptUpgrade();
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.sequence([
      Animated.timing(shutterScale, { toValue: 0.88, duration: 90, useNativeDriver: true }),
      Animated.spring(shutterScale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      await processImage({ uri: photo.uri, base64: photo.base64 });
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
      showAlert('Camera error', 'Could not take the photo. Please try again.');
    }
  };

  const pickImage = async () => {
    if (isProcessing) return;

    const canLearn = await canLearnWord();
    if (!canLearn.allowed) {
      promptUpgrade();
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      await processImage({ uri: asset.uri, base64: asset.base64 });
    }
  };

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <PetSprite
          mood="neutral"
          species={pet?.species}
          outfit={pet?.equippedOutfit}
          pixelSize={8}
        />
        <Text style={styles.permissionTitle}>LET'S SEE THE WORLD</Text>
        <Text style={styles.permissionText}>
          CapWords uses your camera to turn everyday objects into pixel vocabulary stickers.
        </Text>
        <PixelButton
          label="Enable camera"
          icon="camera"
          onPress={requestPermission}
          size="lg"
          style={styles.permissionButton}
        />
      </View>
    );
  }

  const currentLang = LANGUAGES.find((l) => l.code === targetLanguage);
  const remaining = Math.max(dailyGoal - wordsToday, 0);

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={pinchGesture}>
      <CameraView style={styles.camera} facing={facing} zoom={zoom} ref={cameraRef}>
        {/* Freeze the shot while we look up the word */}
        {capturedUri ? (
          <Image source={{ uri: capturedUri }} style={styles.frozenPhoto} />
        ) : null}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.langButton}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('LanguageSelect', {
                current: targetLanguage,
                onSelect: async (code) => {
                  setTargetLanguage(code);
                  await updateUserProfile({ targetLanguage: code });
                },
              })
            }
          >
            <Text style={styles.langShort}>{currentLang?.short}</Text>
            <Text style={styles.langName}>{currentLang?.name}</Text>
            <PixelIcon name="chevron" size={12} color="#FBF3E0" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.flipButton}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setFacing((f) => (f === 'back' ? 'front' : 'back'));
            }}
          >
            <PixelIcon name="flip" size={18} color="#FBF3E0" />
          </TouchableOpacity>
        </View>

        <View style={styles.goalChip}>
          <Text style={styles.goalChipText}>
            {remaining > 0
              ? `${remaining} MORE TO REACH TODAY'S GOAL`
              : 'DAILY GOAL COMPLETE'}
          </Text>
        </View>

        <View style={styles.guideContainer}>
          <View style={styles.guideFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {isProcessing ? (
              <Animated.View style={[styles.processingBox, { transform: [{ scale: pulseAnim }] }]}>
                <ActivityIndicator size="small" color="#FBF3E0" />
                <Text style={styles.processingText}>FINDING THE WORD...</Text>
              </Animated.View>
            ) : null}
          </View>

          {!isProcessing ? (
            <Text style={styles.guideText}>POINT AT AN OBJECT TO LEARN ITS NAME</Text>
          ) : null}
        </View>

        {/* Zoom controls */}
        {!isProcessing ? (
          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomButton} onPress={() => nudgeZoom(0.1)} hitSlop={6}>
              <Text style={styles.zoomButtonText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.zoomLabel}>{(1 + zoom * 5).toFixed(1)}x</Text>
            <TouchableOpacity style={styles.zoomButton} onPress={() => nudgeZoom(-0.1)} hitSlop={6}>
              <Text style={styles.zoomButtonText}>−</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.galleryButton} onPress={pickImage} disabled={isProcessing}>
            <PixelIcon name="images" size={20} color="#FBF3E0" />
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: shutterScale }] }}>
            <TouchableOpacity
              style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
              onPress={takePicture}
              disabled={isProcessing}
              activeOpacity={0.9}
            >
              <View style={styles.captureInner}>
                <PixelIcon name="camera" size={26} color="#FBF3E0" />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.spacer} />
        </View>
      </CameraView>
      </GestureDetector>

      <PaywallModal
        visible={paywallVisible}
        petName={petName}
        pet={pet}
        onClose={() => setPaywallVisible(false)}
        onSeePlans={goToPlans}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  frozenPhoto: { ...StyleSheet.absoluteFillObject },
  zoomControls: {
    position: 'absolute',
    right: 16,
    top: '38%',
    alignItems: 'center',
    gap: 8,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(58,42,26,0.72)',
    borderWidth: 2,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonText: { color: '#FBF3E0', fontSize: 22, fontWeight: '900', lineHeight: 26 },
  zoomLabel: {
    color: '#FBF3E0',
    fontSize: 11,
    fontWeight: '900',
    backgroundColor: 'rgba(58,42,26,0.55)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 36,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 26,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 1,
  },
  permissionText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 21,
  },
  permissionButton: { width: '100%' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 58,
    paddingHorizontal: 18,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(58,42,26,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
    gap: 7,
  },
  langShort: {
    color: COLORS.sun,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  langName: { color: '#FBF3E0', fontSize: 13, fontWeight: '800' },
  flipButton: {
    backgroundColor: 'rgba(58,42,26,0.72)',
    padding: 11,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
  },
  goalChip: {
    alignSelf: 'center',
    marginTop: 14,
    backgroundColor: 'rgba(58,42,26,0.72)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
  },
  goalChipText: { color: '#FBF3E0', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  guideContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  guideFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: COLORS.sun },
  cornerTL: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5 },
  processingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58,42,26,0.8)',
    borderWidth: 2,
    borderColor: COLORS.sun,
    borderRadius: RADIUS.sm,
    padding: 16,
  },
  processingText: {
    color: '#FBF3E0',
    fontSize: 12,
    marginTop: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  guideText: {
    color: '#FBF3E0',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 20,
    letterSpacing: 0.5,
    backgroundColor: 'rgba(58,42,26,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 120,
    paddingHorizontal: 40,
  },
  galleryButton: {
    backgroundColor: 'rgba(58,42,26,0.72)',
    padding: 14,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
  },
  captureButton: {
    width: 82,
    height: 82,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.sun,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
    borderWidth: 4,
    borderColor: COLORS.outline,
  },
  captureButtonDisabled: { opacity: 0.55 },
  captureInner: {
    flex: 1,
    width: '100%',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: { width: 52 },
});
