import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS, SHADOW, getCategoryStyle } from '../../../theme';
import { PixelIcon } from '../../../components';
import { placeName } from './geo';

const CARD = 84;

/**
 * The photos and words behind one pin on the globe, as a strip along the
 * bottom of it. Tapping a card opens that sticker.
 */
export default function PlaceSheet({ items, onClose, onOpenSticker }) {
  const place = placeName(items);

  const renderCard = ({ item }) => {
    const categoryStyle = getCategoryStyle(item.category);
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => onOpenSticker(item)}>
        <View style={styles.photoWrap}>
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.photo} />
          ) : (
            <View style={[styles.photoFallback, { backgroundColor: `${categoryStyle.color}33` }]}>
              <PixelIcon name={categoryStyle.icon} size={26} color={categoryStyle.color} />
            </View>
          )}
        </View>
        <Text style={styles.word} numberOfLines={1}>
          {item.word}
        </Text>
        {item.english ? (
          <Text style={styles.english} numberOfLines={1}>
            {item.english}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {(place || 'SNAPPED HERE').toUpperCase()}
          </Text>
          <Text style={styles.count}>
            {items.length} {items.length === 1 ? 'WORD' : 'WORDS'}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.close}>
          <PixelIcon name="close" size={12} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    paddingTop: 10,
    paddingBottom: 12,
    ...SHADOW.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.8,
  },
  count: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  close: {
    padding: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.sm,
  },
  list: {
    paddingHorizontal: 12,
    gap: 10,
  },
  card: {
    width: CARD,
    alignItems: 'center',
  },
  photoWrap: {
    width: CARD,
    height: CARD,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 6,
    textAlign: 'center',
  },
  english: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 1,
    textAlign: 'center',
  },
});
