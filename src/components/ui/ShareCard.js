import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { APP_LINKS } from '../../config';
import { COLORS } from '../../theme';
import PetSprite from '../pixel/PetSprite';
import { QrCode } from './QrCode';

// A 3:4 card, the shape Xiaohongshu and Instagram crop to. Everything is laid
// out on a 300pt design and scaled to `width`, so the sheet can draw it as
// wide as the screen and capture it at the screen's own resolution (about
// 1080x1440 on a phone) instead of stretching a small picture.
const DESIGN_WIDTH = 300;
export const SHARE_CARD_RATIO = 4 / 3;

/**
 * The picture people post: a hero (the photo, or a place's art), the big
 * line, the buddy and where it is, the app's name and, once APP_LINKS.download
 * is set, a QR code for it. Presentational - the caller passes everything in
 * and ShareSheet captures it.
 *
 *   kicker   small caps line above the title, e.g. "NEW WORD · SPANISH"
 *   title    the word, or the place's name
 *   subtitle pronunciation, or the region
 *   caption  the English meaning, or a line about the trip
 *   hero     node drawn in the top panel, on a 300pt-wide design
 *   heroFill true when the hero fills the panel itself (a photo); otherwise
 *            it is scaled up with the card
 *   pet      { species, equippedOutfit, name }
 *   footer   e.g. "Mochi is at the Great Barrier Reef"
 */
const ShareCard = forwardRef(function ShareCard(
  {
    kicker,
    title,
    subtitle,
    caption,
    hero,
    heroFill = false,
    heroColor = COLORS.sky,
    pet,
    footer,
    width = DESIGN_WIDTH,
  },
  ref
) {
  const k = width / DESIGN_WIDTH;
  const styles = useMemo(() => makeStyles(k), [k]);
  const link = APP_LINKS.download;

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={[styles.hero, { backgroundColor: heroColor }]}>
        {heroFill ? hero : <View style={{ transform: [{ scale: k }] }}>{hero}</View>}
      </View>

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
          pixelSize={Math.max(2, Math.floor(3 * k))}
          animate={false}
        />
        <Text style={styles.footerText} numberOfLines={3}>
          {footer}
        </Text>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>VOYAWORD</Text>
          {link ? <Text style={styles.scan}>Scan to get it</Text> : null}
        </View>
        {link ? <QrCode value={link} size={44 * k} dark={COLORS.outline} light="#FFFFFF" /> : null}
      </View>
    </View>
  );
});

export default ShareCard;

function makeStyles(k) {
  return StyleSheet.create({
    card: {
      width: DESIGN_WIDTH * k,
      height: DESIGN_WIDTH * SHARE_CARD_RATIO * k,
      backgroundColor: COLORS.surface,
      borderWidth: 4 * k,
      borderColor: COLORS.outline,
      overflow: 'hidden',
    },
    hero: {
      height: 190 * k,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderBottomWidth: 4 * k,
      borderBottomColor: COLORS.outline,
    },
    body: {
      flex: 1,
      paddingHorizontal: 18 * k,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kicker: {
      fontSize: 10 * k,
      fontWeight: '900',
      letterSpacing: 2 * k,
      color: COLORS.primaryDark,
    },
    title: {
      marginTop: 4 * k,
      fontSize: 32 * k,
      fontWeight: '900',
      color: COLORS.text,
      textAlign: 'center',
    },
    subtitle: { marginTop: 2 * k, fontSize: 14 * k, fontWeight: '700', color: COLORS.water },
    caption: {
      marginTop: 4 * k,
      fontSize: 13 * k,
      fontWeight: '600',
      color: COLORS.textLight,
      textAlign: 'center',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7 * k,
      paddingHorizontal: 10 * k,
      paddingVertical: 8 * k,
      backgroundColor: COLORS.panel,
      borderTopWidth: 2 * k,
      borderTopColor: COLORS.outlineSoft,
    },
    footerText: { flex: 1, fontSize: 10.5 * k, fontWeight: '800', color: COLORS.text },
    brandBlock: { alignItems: 'flex-end' },
    brand: {
      fontSize: 10 * k,
      fontWeight: '900',
      letterSpacing: 1 * k,
      color: COLORS.primaryDark,
    },
    scan: { marginTop: 2 * k, fontSize: 8 * k, fontWeight: '700', color: COLORS.textLight },
  });
}
