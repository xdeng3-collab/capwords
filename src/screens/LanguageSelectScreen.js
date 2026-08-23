import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, LANGUAGES, RADIUS, SHADOW } from '../config';
import PixelIcon from '../components/PixelIcon';

export default function LanguageSelectScreen({ route, navigation }) {
  const { current, onSelect } = route.params;

  const handleSelect = async (code) => {
    Haptics.selectionAsync().catch(() => {});
    // Wait for the selection to persist before leaving, so screens that
    // reload their profile on focus don't read the old value.
    await onSelect?.(code);
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
        <View style={[styles.shortBubble, selected && styles.shortBubbleSelected]}>
          <Text style={[styles.short, selected && styles.shortSelected]}>{item.short}</Text>
        </View>
        <Text style={[styles.name, selected && styles.nameSelected]}>{item.name}</Text>
        {selected ? <PixelIcon name="check" size={20} color={COLORS.leafDark} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={10}>
          <PixelIcon name="arrowLeft" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>CHOOSE LANGUAGE</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={styles.subtitle}>Which language would you like to learn?</Text>

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
  container: { flex: 1, backgroundColor: COLORS.background },
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
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.outline,
    padding: 8,
  },
  title: { fontSize: 16, fontWeight: '900', color: COLORS.text, letterSpacing: 1 },
  headerSpacer: { width: 40 },
  subtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '600',
  },
  listContent: { padding: 20, paddingBottom: 120 },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 10,
    gap: 14,
    borderWidth: 3,
    borderColor: COLORS.outline,
    ...SHADOW.soft,
  },
  languageItemSelected: {
    borderColor: COLORS.leafDark,
    backgroundColor: `${COLORS.leaf}22`,
  },
  shortBubble: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 2,
    borderColor: COLORS.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortBubbleSelected: { backgroundColor: COLORS.leaf },
  short: { fontSize: 14, fontWeight: '900', color: COLORS.textLight, letterSpacing: 0.5 },
  shortSelected: { color: '#FBF3E0' },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.text },
  nameSelected: { color: COLORS.leafDark },
});
