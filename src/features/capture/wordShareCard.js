import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { LANGUAGES } from '../../config';
import { PixelIcon } from '../../components';
import { getCategoryStyle } from '../../theme';
import { formatPronunciation } from '../../utils/text';

/**
 * What ShareSheet needs to post a learned word: the card's props and the
 * text that goes with it. `place` is the buddy's current stop, if known.
 */
export function wordShareCard({ sticker, pet, place }) {
  const language = LANGUAGES.find((l) => l.code === sticker.language)?.name || sticker.language;
  const category = getCategoryStyle(sticker.category);
  const buddy = pet?.name || 'My buddy';

  const hero = sticker.imageUri ? (
    <Image source={{ uri: sticker.imageUri }} style={styles.photo} />
  ) : (
    <PixelIcon name={category.icon} size={96} color={category.color} />
  );

  return {
    card: {
      kicker: `NEW WORD · ${String(language).toUpperCase()}`,
      title: sticker.word,
      subtitle: sticker.pronunciation ? formatPronunciation(sticker.pronunciation) : null,
      caption: sticker.english,
      hero,
      heroFill: !!sticker.imageUri,
      pet,
      footer: place ? `${buddy} is at ${place.name}` : `Learned with ${buddy}`,
    },
    message: sticker.english
      ? `Today I learned "${sticker.word}" (${sticker.english}) on Voyaword.`
      : `Today I learned "${sticker.word}" on Voyaword.`,
  };
}

const styles = StyleSheet.create({
  photo: { width: '100%', height: '100%' },
});
