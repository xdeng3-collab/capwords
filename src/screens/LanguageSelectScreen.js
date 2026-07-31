import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, LANGUAGES } from '../config';

export default function LanguageSelectScreen({ route, navigation }) {
  const { current, onSelect } = route.params;

  const handleSelect = (code) => {
    onSelect(code);
    navigation.goBack();
  };

  const renderLanguage = ({ item }) => (
    <TouchableOpacity
      style={[styles.languageItem, item.code === current && styles.languageItemSelected]}
      onPress={() => handleSelect(item.code)}
    >
      <Text style={styles.flag}>{item.flag}</Text>
      <Text style={[styles.name, item.code === current && styles.nameSelected]}>
        {item.name}
      </Text>
      {item.code === current && (
        <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Choose Language</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={LANGUAGES}
        renderItem={renderLanguage}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.listContent}
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  listContent: {
    padding: 20,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    gap: 14,
  },
  languageItemSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  flag: {
    fontSize: 28,
  },
  name: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  nameSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
});
