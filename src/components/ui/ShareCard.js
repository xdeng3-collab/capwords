import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../theme';
import PetSprite from '../pixel/PetSprite';

// A 3:4 card, the shape Xiaohongshu and Instagram crop to. It is captured at
// 4x, so the 300pt design comes out at 1200x1600.
export const SHARE_CARD_WIDTH = 300;
export const SHARE_CARD_HEIGHT = 400;

/**
 * The picture people post: a hero (the photo, or a place's art), the big
 * line, the buddy and where it is, and the app's name. Presentational - the
 * caller passes everything in and ShareSheet captures it.
 *
 *   kicker   small caps line above the title, e.g. "NEW WORD · SPANISH"
 *   title    the word, or the place's name
 *   subtitle pronunciation, or the region
 *   caption  the English meaning, or a line about the trip
 *   hero     node drawn in the top panel
 *   pet      { species, equippedOutfit, name }
 *   footer   e.g. "Mochi is at the Great Barrier Reef"
 */
const ShareCard = forwardRef(function ShareCard(
  { kicker, title, subtitle, caption, hero, heroColor = COLORS.sky, pet, footer },
  ref
) {
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={[styles.hero, { backgroundColor: heroColor }]}>{hero}</View>

      <View style={styles.body}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {caption ? (
          <Text style={styles.caption} numberOfLines={2}>
            {caption}
          </Text>
        ) : null}
      </View>

      <View style={styles.footer}>
        <PetSprite
          mood="happy"
          species={pet?.species}
          outfit={pet?.equippedOutfit}
          pixelSize={3}
          animate={false}
        />
        <Text style={styles.footerText} numberOfLines={2}>
          {footer}
        </Text>
        <Text style={styles.brand}>VOYAWORD</Text>
      </View>
    </View>
  );
});

export default ShareCard;

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    backgroundColor: COLORS.surface,
    borderWidth: 4,
    borderColor: COLORS.outline,
    overflow: 'hidden',
  },
  hero: {
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderBottomWidth: 4,
    borderBottomColor: COLORS.outline,
  },
  body: { flex: 1, paddingHorizontal: 18, paddingTop: 12, alignItems: 'center' },
  kicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    color: COLORS.primaryDark,
  },
  title: {
    marginTop: 4,
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: { marginTop: 2, fontSize: 14, fontWeight: '700', color: COLORS.water },
  caption: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.panel,
    borderTopWidth: 2,
    borderTopColor: COLORS.outlineSoft,
  },
  footerText: { flex: 1, fontSize: 11, fontWeight: '800', color: COLORS.text },
  brand: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, color: COLORS.primaryDark },
});
