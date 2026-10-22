import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  HELP_FAQ,
  MANAGE_SUBSCRIPTIONS_URL,
  REFUND_URL,
  ROUTES,
  SUPPORT_EMAIL,
  TERMS_OF_USE_URL,
} from '../../config';
import { COLORS, RADIUS, SHADOW } from '../../theme';
import { BackButton, PixelSprite } from '../../components';
import { selectFeedback } from '../../utils/haptics';

const CHEVRON = { grid: ['cc...', '.cc..', '..cc.', '.cc..', 'cc...'], palette: { c: COLORS.textMuted } };
const CHEVRON_DOWN = { grid: ['c...c', 'cc.cc', '.ccc.', '..c..'], palette: { c: COLORS.textMuted } };

/** Answers first, then the ways to get more help. */
export default function HelpScreen({ navigation }) {
  const [openIndex, setOpenIndex] = useState(null);
  const open = (url) => Linking.openURL(url).catch(() => {});

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>HELP & SUPPORT</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.groupTitle}>COMMON QUESTIONS</Text>
        <View style={styles.card}>
          {HELP_FAQ.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <View key={item.q} style={[styles.faq, i < HELP_FAQ.length - 1 && styles.divider]}>
                <TouchableOpacity
                  style={styles.faqHead}
                  onPress={() => {
                    selectFeedback();
                    setOpenIndex(isOpen ? null : i);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                >
                  <Text style={styles.question}>{item.q}</Text>
                  <PixelSprite
                    grid={isOpen ? CHEVRON_DOWN.grid : CHEVRON.grid}
                    palette={CHEVRON.palette}
                    pixelSize={2}
                  />
                </TouchableOpacity>
                {isOpen ? <Text style={styles.answer}>{item.a}</Text> : null}
              </View>
            );
          })}
        </View>

        <Text style={styles.groupTitle}>MORE HELP</Text>
        <View style={styles.card}>
          {SUPPORT_EMAIL ? (
            <LinkRow
              label="Email us"
              value={SUPPORT_EMAIL}
              onPress={() => open(`mailto:${SUPPORT_EMAIL}?subject=CapWords%20help`)}
            />
          ) : null}
          <LinkRow label="Manage subscription" onPress={() => open(MANAGE_SUBSCRIPTIONS_URL)} />
          <LinkRow label="Request a refund" onPress={() => open(REFUND_URL)} />
          <LinkRow label="Privacy policy" onPress={() => navigation.navigate(ROUTES.PRIVACY_POLICY)} />
          <LinkRow label="Terms of use" onPress={() => open(TERMS_OF_USE_URL)} last />
        </View>
      </ScrollView>
    </View>
  );
}

function LinkRow({ label, value, onPress, last }) {
  return (
    <TouchableOpacity
      style={[styles.linkRow, !last && styles.divider]}
      onPress={onPress}
      accessibilityRole="link"
    >
      <Text style={styles.linkLabel}>{label}</Text>
      {value ? <Text style={styles.linkValue} numberOfLines={1}>{value}</Text> : null}
      <PixelSprite grid={CHEVRON.grid} palette={CHEVRON.palette} pixelSize={2} />
    </TouchableOpacity>
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
    paddingBottom: 8,
  },
  title: { fontSize: 16, fontWeight: '900', color: COLORS.text, letterSpacing: 1 },
  headerSpacer: { width: 40 },
  content: { padding: 20, paddingBottom: 140 },
  groupTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textLight,
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  divider: { borderBottomWidth: 2, borderBottomColor: COLORS.surfaceAlt },
  faq: { paddingHorizontal: 14 },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  question: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.text },
  answer: { fontSize: 14, fontWeight: '600', color: COLORS.textLight, lineHeight: 20, paddingBottom: 14 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14 },
  linkLabel: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.text },
  linkValue: { maxWidth: '55%', fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
});
