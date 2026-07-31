import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, LANGUAGES, RADIUS, SHADOW } from '../config';

export default function LanguageSelectScreen({ route, navigation }) {
  const { current, onSelect } = route.params;

  const handleSelect = (code) => {
    Haptics.selectionAsync().catch(() => {});
    onSelect?.(code);
    navigation.goBack();
  };

  const renderLanguage = ({ item }) => {
    const selected = item.code === current;
    return (
      <TouchableOpacity
        style={[styles.languageItem, selected && styles.languageItemSelected]}
        onPress={() => handleSelect(item.code)}
        activeOpacity={0.85}
      >
        <View style={styles.flagBubble}>
          <Text style={styles.flag}>{item.flag}</Text>
        </View>
        <Text style={[styles.name, selected && styles.nameSelected]}>{item.name}</Text>
        {selected ? (
          <Ionicons name="checkmark-circle" size={23} color={COLORS.primary} />
        ) : (
          <Ionicons name="ellipse-outline" size={21} color={COLORS.border} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Choose language</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={styles.subtitle}>Which language would you like to learn? 🌍</Text>

      <FlatList
        data={LANGUAGES}
        renderItem={renderLanguage}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  backButton: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    padding: 9,
    ...SHADOW.soft,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 40,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 10,
  },
  listContent: {
    padding: 20,
    paddingBottom: 120,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 13,
    borderRadius: RADIUS.md,
    marginBottom: 10,
    gap: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOW.soft,
  },
  languageItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}0A`,
  },
  flagBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flag: {
    fontSize: 24,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  nameSelected: {
    color: COLORS.primary,
  },
});
