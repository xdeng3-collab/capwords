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
  Linking,
} from 'react-native';
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { LANGUAGES, ROUTES, TABS } from '../../config';
import { COLORS, RADIUS } from '../../theme';
import {
  PaywallModal,
  PetSprite,
  PixelButton,
  PixelIcon,
  PixelSprite,
  useAlert,
} from '../../components';
import { recognizeAndTranslate, RecognitionFailedError } from '../../services/aiService';
import { recordLearnedWord } from '../../services/learningService';
import { getPet } from '../../services/petService';
import { getUserProfile, updateUserProfile } from '../../services/profileService';
import { getDailyWordCount } from '../../services/progressService';
import { canLearnWord } from '../../services/subscriptionService';
import { pressFeedback, selectFeedback } from '../../utils/haptics';
import { CARET_DOWN, FLIP_ICON, PHOTOS_ICON } from './cameraArt';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_SIZE = SCREEN_WIDTH * 0.68;
const ZOOM_PRESETS = [1, 2, 3];

/** A labelled round button beside the shutter (Photos, Flip). */
function SideControl({ label, onPress, disabled, accessibilityLabel, children }) {
  return (
    <TouchableOpacity
      style={styles.sideControl}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.sideButton, disabled && styles.sideButtonDisabled]}>{children}</View>
      <Text style={styles.sideLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

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
  // 'camera' | 'library', or null until the profile has loaded. Onboarding
  // sets it; we hold the render until we know, so a library-only person never
  // sees the camera wall flash past on the way in.
  const [photoSource, setPhotoSource] = useState(null);
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
    setPhotoSource(profile.photoSource === 'library' ? 'library' : 'camera');
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
    navigation.navigate(TABS.PROFILE, { screen: ROUTES.SUBSCRIPTION });
  };

  const processImage = async ({ uri, base64 }) => {
    setIsProcessing(true);
    setCapturedUri(uri);
    try {
      const langName =
        LANGUAGES.find((l) => l.code === targetLanguage)?.name || targetLanguage;

      // Step 1: recognise. Nothing is saved or charged until this succeeds.
      let recognition;
      let location;
      try {
        [recognition, location] = await Promise.all([
          recognizeAndTranslate(base64, langName),
          captureLocation(),
        ]);
      } catch (error) {
        // Say plainly that the word was not used — a failed snap that
        // silently costs a word is the thing people notice and resent.
        console.error('Recognition failed', error);
        const couldNotSee = error instanceof RecognitionFailedError;
        showAlert(
          couldNotSee ? "Couldn't read that one" : 'Something went wrong',
          couldNotSee
            ? "We couldn't work out what's in the photo. Try getting closer, or finding better light.\n\nThis one is free — no word was used."
            : "We couldn't reach the word service. Check your connection and try again.\n\nThis one is free — no word was used."
        );
        return;
      }

      // Step 2: keep it. Past this point the word may already be saved, so a
      // failure must not claim the word was free.
      try {
        const { sticker, goalJustReached, streak } = await recordLearnedWord({
          recognition,
          imageUri: uri,
          language: targetLanguage,
          location,
        });
        // No reload here: coming back from the result screen refocuses this
        // one, and the focus effect reloads today's count.
        navigation.navigate(ROUTES.STICKER_RESULT, {
          sticker,
          recognition,
          goalJustReached,
          streak,
        });
      } catch (error) {
        console.error('Saving the word failed', error);
        showAlert(
          'Something went wrong',
          `We recognised "${recognition.word}" but hit a problem saving it. Check your Book before trying again.`
        );
      }
    } finally {
      setIsProcessing(false);
      setCapturedUri(null);
    }
  };

  const clampZoom = (z) => Math.min(Math.max(z, 0), 0.6);
  // expo-camera zoom runs 0..1; the label shows it as 1x + 5x per unit.
  const setZoomFactor = (factor) => {
    selectFeedback();
    setZoom(clampZoom((factor - 1) / 5));
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

  /**
   * Ask for the camera the first time someone reaches for the shutter — never
   * on the way into the tab, and never a second time after iOS has stopped
   * allowing the prompt. Returns true once the camera is usable.
   */
  const enableCamera = async () => {
    if (permission?.canAskAgain === false) {
      showAlert(
        'Camera is switched off',
        'CapWords needs the camera to snap a word. You can turn it on in Settings, or pick a photo from your library instead.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings().catch(() => {}) },
        ]
      );
      return false;
    }

    const result = await requestPermission();
    if (!result?.granted) return false;

    // They opted in at the shutter, so stop treating them as library-only.
    setPhotoSource('camera');
    updateUserProfile({ photoSource: 'camera' }).catch(() => {});
    return true;
  };

  const takePicture = async () => {
    if (isProcessing) return;

    const canLearn = await canLearnWord();
    if (!canLearn.allowed) {
      promptUpgrade();
      return;
    }

    // No camera yet: this tap buys the permission prompt, and the viewfinder
    // takes over from here. The next tap is the one that takes the photo.
    if (!permission?.granted) {
      await enableCamera();
      return;
    }

    if (!cameraRef.current) return;

    pressFeedback();
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

  // Hold the screen until we know both the permission state and the choice
  // made in onboarding.
  if (!permission || photoSource === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // People who picked the camera in onboarding still get the upfront ask.
  // Library-only people fall through to the snap interface instead.
  if (!permission.granted && photoSource !== 'library') {
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
  // Library-only people see the same chrome over a plain backdrop until they
  // turn the camera on from the shutter.
  const cameraActive = permission.granted;

  const zoomFactor = 1 + zoom * 5;
  // The preset the current zoom has reached; pinching between presets shows
  // the exact factor on that pill, like the system camera.
  const activePreset = [...ZOOM_PRESETS].reverse().find((p) => zoomFactor >= p - 0.05) || 1;

  const overlay = (
    <>
      {/* Freeze the shot while we look up the word */}
      {capturedUri ? (
        <Image source={{ uri: capturedUri }} style={styles.frozenPhoto} />
      ) : null}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.langButton}
          activeOpacity={0.85}
          accessibilityLabel={`Learning ${currentLang?.name}. Change language`}
          onPress={() =>
            navigation.navigate(ROUTES.LANGUAGE_SELECT, {
              current: targetLanguage,
              onSelect: async (code) => {
                setTargetLanguage(code);
                await updateUserProfile({ targetLanguage: code });
              },
            })
          }
        >
          <View>
            <Text style={styles.langKicker}>LEARNING</Text>
            <Text style={styles.langName}>{currentLang?.name}</Text>
          </View>
          <PixelSprite grid={CARET_DOWN.grid} palette={CARET_DOWN.palette} pixelSize={2} />
        </TouchableOpacity>

        <View
          style={[styles.goalPill, remaining === 0 && styles.goalPillDone]}
          accessible
          accessibilityLabel={`${wordsToday} of ${dailyGoal} words today`}
        >
          <PixelIcon
            name={remaining === 0 ? 'check' : 'target'}
            size={16}
            color={remaining === 0 ? COLORS.leaf : COLORS.sun}
            light="#FBF3E0"
          />
          <Text style={styles.goalPillText}>
            {Math.min(wordsToday, dailyGoal)}/{dailyGoal}
          </Text>
        </View>
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

          {!isProcessing && !cameraActive ? (
            <View style={styles.libraryHint}>
              <PixelSprite grid={PHOTOS_ICON.grid} palette={PHOTOS_ICON.palette} pixelSize={5} />
            </View>
          ) : null}
        </View>

        {!isProcessing ? (
          <Text style={styles.guideText}>
            {cameraActive
              ? 'Point at something, then tap the yellow button'
              : 'Pick a photo, or tap the button to use the camera'}
          </Text>
        ) : null}
      </View>

      {/* Zoom presets, like the system camera. Pinching still works. */}
      {!isProcessing && cameraActive ? (
        <View style={styles.zoomRow}>
          {ZOOM_PRESETS.map((p) => {
            const active = p === activePreset;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.zoomPill, active && styles.zoomPillActive]}
                onPress={() => setZoomFactor(p)}
                hitSlop={6}
                accessibilityLabel={`Zoom ${p} times`}
              >
                <Text style={[styles.zoomPillText, active && styles.zoomPillTextActive]}>
                  {active ? `${Number(zoomFactor.toFixed(1))}\u00d7` : `${p}\u00d7`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <View style={styles.bottomBar}>
        <SideControl
          label="PHOTOS"
          onPress={pickImage}
          disabled={isProcessing}
          accessibilityLabel="Choose a photo from your library"
        >
          <PixelSprite grid={PHOTOS_ICON.grid} palette={PHOTOS_ICON.palette} pixelSize={3} />
        </SideControl>

        <View style={styles.shutterColumn}>
          <Animated.View style={{ transform: [{ scale: shutterScale }] }}>
            <TouchableOpacity
              style={[styles.shutter, isProcessing && styles.shutterDisabled]}
              onPress={takePicture}
              disabled={isProcessing}
              activeOpacity={0.9}
              accessibilityLabel={cameraActive ? 'Take photo' : 'Turn on the camera'}
            >
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {cameraActive ? (
          <SideControl
            label="FLIP"
            onPress={() => {
              selectFeedback();
              setFacing((f) => (f === 'back' ? 'front' : 'back'));
            }}
            disabled={isProcessing}
            accessibilityLabel={facing === 'back' ? 'Switch to front camera' : 'Switch to back camera'}
          >
            <PixelSprite grid={FLIP_ICON.grid} palette={FLIP_ICON.palette} pixelSize={3} />
          </SideControl>
        ) : (
          <View style={styles.sideControl} />
        )}
      </View>
    </>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      {cameraActive ? (
        <GestureDetector gesture={pinchGesture}>
          <CameraView style={styles.camera} facing={facing} zoom={zoom} ref={cameraRef}>
            {overlay}
          </CameraView>
        </GestureDetector>
      ) : (
        <View style={[styles.camera, styles.libraryBackdrop]}>{overlay}</View>
      )}

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
  // Stand-in for the viewfinder before the camera is switched on.
  libraryBackdrop: { backgroundColor: '#14100D' },
  libraryHint: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.45,
  },
  frozenPhoto: { ...StyleSheet.absoluteFillObject },
  zoomRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
    padding: 4,
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(20,16,13,0.55)',
  },
  zoomPill: {
    minWidth: 34,
    height: 30,
    paddingHorizontal: 6,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomPillActive: { backgroundColor: 'rgba(20,16,13,0.85)' },
  zoomPillText: { color: '#FBF3E0', fontSize: 12, fontWeight: '800' },
  zoomPillTextActive: { color: COLORS.sun, fontWeight: '900' },
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
    backgroundColor: 'rgba(58,42,26,0.78)',
    paddingLeft: 12,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.outline,
    gap: 10,
  },
  langKicker: { color: COLORS.sun, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  langName: { color: '#FBF3E0', fontSize: 15, fontWeight: '800' },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(58,42,26,0.78)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.outline,
  },
  goalPillDone: { borderColor: COLORS.leaf },
  goalPillText: { color: '#FBF3E0', fontSize: 15, fontWeight: '900' },
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
    fontSize: 13,
    fontWeight: '800',
    marginTop: 20,
    backgroundColor: 'rgba(58,42,26,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 116,
    paddingHorizontal: 28,
  },
  sideControl: { width: 72, alignItems: 'center' },
  sideButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(58,42,26,0.78)',
    borderWidth: 2,
    borderColor: 'rgba(251,243,224,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButtonDisabled: { opacity: 0.5 },
  sideLabel: {
    color: '#FBF3E0',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  shutterColumn: { alignItems: 'center' },
  // A round shutter reads as "take a photo" on any phone.
  shutter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    borderColor: '#FBF3E0',
    padding: 4,
    backgroundColor: 'rgba(20,16,13,0.25)',
  },
  shutterDisabled: { opacity: 0.55 },
  shutterInner: {
    flex: 1,
    borderRadius: 34,
    backgroundColor: COLORS.sun,
    borderWidth: 3,
    borderColor: COLORS.outline,
  },
});
