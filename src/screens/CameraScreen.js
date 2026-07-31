import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, LANGUAGES, RADIUS, SHADOW } from '../config';
import { GradientButton } from '../components/UI';
import { recognizeAndTranslate } from '../services/aiService';
import {
  saveSticker,
  getUserProfile,
  canLearnWord,
  consumeWord,
  getDailyWordCount,
} from '../services/storageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_SIZE = SCREEN_WIDTH * 0.68;

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [wordsToday, setWordsToday] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(5);

  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shutterScale = useRef(new Animated.Value(1)).current;

  const loadProfile = useCallback(async () => {
    const [profile, count] = await Promise.all([getUserProfile(), getDailyWordCount()]);
    setTargetLanguage(profile.targetLanguage);
    setDailyGoal(profile.dailyGoal);
    setWordsToday(count);
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

  const promptUpgrade = () => {
    Alert.alert(
      'Daily words used up 🌙',
      "You've learned all your free words for today. Upgrade for unlimited learning!",
      [
        { text: 'Maybe later', style: 'cancel' },
        { text: 'See plans', onPress: () => navigation.navigate('Subscription') },
      ]
    );
  };

  /** Shared pipeline for both camera capture and library picks. */
  const processImage = async ({ uri, base64 }) => {
    setIsProcessing(true);
    try {
      const langName =
        LANGUAGES.find((l) => l.code === targetLanguage)?.name || targetLanguage;
      const recognition = await recognizeAndTranslate(base64, langName);

      const sticker = await saveSticker({
        imageUri: uri,
        word: recognition.word,
        pronunciation: recognition.pronunciation,
        english: recognition.english,
        description: recognition.description,
        category: recognition.category,
        language: targetLanguage,
      });

      await consumeWord();
      await loadProfile();

      navigation.navigate('StickerResult', { sticker, recognition });
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Hmm, that did not work 😅',
        "We couldn't recognise that one. Try getting a little closer or find better light."
      );
    } finally {
      setIsProcessing(false);
    }
  };

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
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      });
      await processImage({ uri: photo.uri, base64: photo.base64 });
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
      Alert.alert('Camera error', 'Could not take the photo. Please try again.');
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
        <View style={styles.permissionBubble}>
          <Text style={styles.permissionEmoji}>📷</Text>
        </View>
        <Text style={styles.permissionTitle}>Let's see the world!</Text>
        <Text style={styles.permissionText}>
          CapWords uses your camera to turn everyday objects into cute vocabulary stickers.
        </Text>
        <GradientButton
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
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.languageSelector}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('LanguageSelect', {
                current: targetLanguage,
                onSelect: (code) => setTargetLanguage(code),
              })
            }
          >
            <Text style={styles.languageFlag}>{currentLang?.flag}</Text>
            <Text style={styles.languageName}>{currentLang?.name}</Text>
            <Ionicons name="chevron-down" size={15} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.flipButton}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setFacing((f) => (f === 'back' ? 'front' : 'back'));
            }}
          >
            <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Daily goal chip */}
        <View style={styles.goalChip}>
          <Text style={styles.goalChipText}>
            {remaining > 0
              ? `${remaining} more to hit today's goal 🎯`
              : "Daily goal complete! Keep going 🎉"}
          </Text>
        </View>

        {/* Viewfinder */}
        <View style={styles.guideContainer}>
          <View style={styles.guideFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {isProcessing ? (
              <Animated.View
                style={[styles.processingOverlay, { transform: [{ scale: pulseAnim }] }]}
              >
                <LinearGradient
                  colors={GRADIENTS.primary}
                  style={styles.processingBubble}
                >
                  <ActivityIndicator size="small" color="#fff" />
                </LinearGradient>
                <Text style={styles.processingText}>Finding the word…</Text>
              </Animated.View>
            ) : null}
          </View>

          {!isProcessing ? (
            <Text style={styles.guideText}>Point at an object to learn its name ✨</Text>
          ) : null}
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={pickImage}
            disabled={isProcessing}
          >
            <Ionicons name="images-outline" size={24} color="#fff" />
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: shutterScale }] }}>
            <TouchableOpacity
              style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
              onPress={takePicture}
              disabled={isProcessing}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={GRADIENTS.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.captureButtonInner}
              >
                <Ionicons name="sparkles" size={26} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.spacer} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
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
  permissionBubble: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.card,
  },
  permissionEmoji: {
    fontSize: 54,
  },
  permissionTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 26,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 23,
  },
  permissionButton: {
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 58,
    paddingHorizontal: 20,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.pill,
    gap: 7,
  },
  languageFlag: {
    fontSize: 17,
  },
  languageName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.42)',
    padding: 11,
    borderRadius: RADIUS.pill,
  },
  goalChip: {
    alignSelf: 'center',
    marginTop: 14,
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  goalChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  guideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: RADIUS.md,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: RADIUS.md,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: RADIUS.md,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: RADIUS.md,
  },
  processingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingBubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 15,
    marginTop: 14,
    fontWeight: '700',
  },
  guideText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 122,
    paddingHorizontal: 42,
  },
  galleryButton: {
    backgroundColor: 'rgba(0,0,0,0.42)',
    padding: 14,
    borderRadius: RADIUS.pill,
  },
  captureButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(255,255,255,0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  captureButtonDisabled: {
    opacity: 0.55,
  },
  captureButtonInner: {
    flex: 1,
    width: '100%',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    width: 52,
  },
});
