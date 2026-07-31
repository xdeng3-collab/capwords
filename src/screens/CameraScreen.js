import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, LANGUAGES } from '../config';
import { recognizeAndTranslate } from '../services/aiService';
import { saveSticker, getUserProfile, canLearnWord, consumeWord } from '../services/storageService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [result, setResult] = useState(null);
  const [targetLanguage, setTargetLanguage] = useState('es');
  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isProcessing]);

  const loadProfile = async () => {
    const profile = await getUserProfile();
    setTargetLanguage(profile.targetLanguage);
  };

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={80} color={COLORS.primary} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          CapWords needs your camera to take photos of objects you want to learn.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current || isProcessing) return;

    // Check if user can learn more words
    const canLearn = await canLearnWord();
    if (!canLearn.allowed) {
      Alert.alert(
        'Word Limit Reached',
        'You\'ve used all your free words today. Upgrade to learn more!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') },
        ]
      );
      return;
    }

    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      });
      setCapturedImage(photo.uri);
      
      const langName = LANGUAGES.find(l => l.code === targetLanguage)?.name || targetLanguage;
      const recognition = await recognizeAndTranslate(photo.base64, langName);
      
      setResult(recognition);
      
      // Save sticker
      const sticker = await saveSticker({
        imageUri: photo.uri,
        word: recognition.word,
        pronunciation: recognition.pronunciation,
        english: recognition.english,
        description: recognition.description,
        category: recognition.category,
        language: targetLanguage,
      });
      
      // Consume word from balance if per-word plan
      await consumeWord();
      
      // Navigate to sticker result
      navigation.navigate('StickerResult', { sticker, recognition });
    } catch (error) {
      Alert.alert('Error', 'Failed to recognize the object. Please try again.');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const pickImage = async () => {
    const canLearn = await canLearnWord();
    if (!canLearn.allowed) {
      Alert.alert(
        'Word Limit Reached',
        'You\'ve used all your free words today. Upgrade to learn more!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setIsProcessing(true);
      setCapturedImage(result.assets[0].uri);
      
      try {
        const langName = LANGUAGES.find(l => l.code === targetLanguage)?.name || targetLanguage;
        const recognition = await recognizeAndTranslate(result.assets[0].base64, langName);
        
        setResult(recognition);
        
        const sticker = await saveSticker({
          imageUri: result.assets[0].uri,
          word: recognition.word,
          pronunciation: recognition.pronunciation,
          english: recognition.english,
          description: recognition.description,
          category: recognition.category,
          language: targetLanguage,
        });
        
        await consumeWord();
        navigation.navigate('StickerResult', { sticker, recognition });
      } catch (error) {
        Alert.alert('Error', 'Failed to recognize the object. Please try again.');
        console.error(error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const currentLang = LANGUAGES.find(l => l.code === targetLanguage);

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.languageSelector}
            onPress={() => navigation.navigate('LanguageSelect', { 
              current: targetLanguage,
              onSelect: (code) => setTargetLanguage(code)
            })}
          >
            <Text style={styles.languageFlag}>{currentLang?.flag}</Text>
            <Text style={styles.languageName}>{currentLang?.name}</Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.flipButton}
            onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
          >
            <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Center guide */}
        <View style={styles.guideContainer}>
          <View style={styles.guideFrame}>
            {isProcessing && (
              <Animated.View style={[styles.processingOverlay, { transform: [{ scale: pulseAnim }] }]}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.processingText}>Recognizing...</Text>
              </Animated.View>
            )}
          </View>
          <Text style={styles.guideText}>Point at an object to learn its name</Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
            <Ionicons name="images-outline" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
            onPress={takePicture}
            disabled={isProcessing}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <View style={styles.placeholder} />
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
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  languageFlag: {
    fontSize: 18,
  },
  languageName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 20,
  },
  guideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 16,
  },
  processingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 50,
    paddingHorizontal: 30,
  },
  galleryButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 14,
    borderRadius: 25,
  },
  captureButton: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  placeholder: {
    width: 56,
  },
});
