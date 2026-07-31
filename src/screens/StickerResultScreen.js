import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function StickerResultScreen({ route, navigation }) {
  const { sticker, recognition } = route.params;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordedUri, setRecordedUri] = useState(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const recordPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry animation
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
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordPulse, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(recordPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      recordPulse.setValue(1);
    }
  }, [isRecording]);

  const speakWord = () => {
    setIsPlaying(true);
    Speech.speak(sticker.word || recognition.word, {
      language: sticker.language,
      rate: 0.8,
      onDone: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  };

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording', error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecordedUri(uri);
    setRecording(null);

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
  };

  const playRecording = async () => {
    if (!recordedUri) return;
    
    const { sound } = await Audio.Sound.createAsync({ uri: recordedUri });
    await sound.playAsync();
  };

  return (
    <View style={styles.container}>
      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={28} color={COLORS.text} />
      </TouchableOpacity>

      {/* Sticker Display */}
      <Animated.View style={[styles.stickerContainer, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.stickerCard}>
          <Image source={{ uri: sticker.imageUri }} style={styles.stickerImage} />
          <View style={styles.stickerBadge}>
            <Text style={styles.stickerEmoji}>✨</Text>
          </View>
        </View>
      </Animated.View>

      {/* Word Info */}
      <Animated.View style={[styles.wordContainer, { opacity: fadeAnim }]}>
        <Text style={styles.wordText}>{recognition.word}</Text>
        <Text style={styles.pronunciationText}>/{recognition.pronunciation}/</Text>
        <Text style={styles.englishText}>{recognition.english}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{recognition.category}</Text>
        </View>
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View style={[styles.actionsContainer, { opacity: fadeAnim }]}>
        {/* Listen Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.listenButton]}
          onPress={speakWord}
          disabled={isPlaying}
        >
          <Ionicons 
            name={isPlaying ? "volume-high" : "volume-medium-outline"} 
            size={28} 
            color="#fff" 
          />
          <Text style={styles.actionButtonText}>
            {isPlaying ? 'Playing...' : 'Listen'}
          </Text>
        </TouchableOpacity>

        {/* Record Button - Press and hold */}
        <TouchableOpacity
          style={[styles.actionButton, styles.recordButton, isRecording && styles.recordingActive]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ scale: recordPulse }] }}>
            <Ionicons 
              name={isRecording ? "mic" : "mic-outline"} 
              size={28} 
              color="#fff" 
            />
          </Animated.View>
          <Text style={styles.actionButtonText}>
            {isRecording ? 'Recording...' : 'Hold to Record'}
          </Text>
        </TouchableOpacity>

        {/* Play Recording Button */}
        {recordedUri && (
          <TouchableOpacity
            style={[styles.actionButton, styles.playbackButton]}
            onPress={playRecording}
          >
            <Ionicons name="play-outline" size={28} color="#fff" />
            <Text style={styles.actionButtonText}>Play My Voice</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Done Button */}
      <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    paddingTop: 60,
  },
  closeButton: {
    position: 'absolute',
    top: 55,
    right: 20,
    padding: 8,
    zIndex: 10,
  },
  stickerContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  stickerCard: {
    width: SCREEN_WIDTH * 0.55,
    height: SCREEN_WIDTH * 0.55,
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  stickerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  stickerBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickerEmoji: {
    fontSize: 24,
  },
  wordContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  wordText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  pronunciationText: {
    fontSize: 18,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  englishText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: COLORS.primaryLight + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actionsContainer: {
    width: '100%',
    paddingHorizontal: 30,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  listenButton: {
    backgroundColor: COLORS.primary,
  },
  recordButton: {
    backgroundColor: COLORS.secondary,
  },
  recordingActive: {
    backgroundColor: '#E74C3C',
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  playbackButton: {
    backgroundColor: COLORS.accent,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: COLORS.text,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
