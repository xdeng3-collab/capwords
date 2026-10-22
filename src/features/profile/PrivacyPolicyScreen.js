import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PRIVACY_SECTIONS, PRIVACY_SUMMARY, PRIVACY_UPDATED, SUPPORT_EMAIL } from '../../config';
import { COLORS, RADIUS } from '../../theme';
import { BackButton } from '../../components';

/** The privacy policy, in the app itself so it is always one tap away. */
export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>PRIVACY POLICY</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated {PRIVACY_UPDATED}</Text>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>THE SHORT VERSION</Text>
          {PRIVACY_SUMMARY.map((line) => (
            <Bullet key={line} text={line} strong />
          ))}
        </View>

        {PRIVACY_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.heading}>{section.title}</Text>
            {section.body.map((part, i) =>
              Array.isArray(part) ? (
                <View key={i} style={styles.list}>
                  {part.map((item) => (
                    <Bullet key={item} text={item} />
                  ))}
                </View>
              ) : (
                <Text key={i} style={styles.paragraph}>
                  {part}
                </Text>
              )
            )}
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.heading}>Contact</Text>
          {SUPPORT_EMAIL ? (
            <Text style={styles.paragraph}>
              Questions or requests about your data:{' '}
              <Text style={styles.link} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
                {SUPPORT_EMAIL}
              </Text>
            </Text>
          ) : (
            <Text style={styles.paragraph}>
              Questions or requests about your data: use Me → Help & support.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Bullet({ text, strong }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={[styles.bulletText, strong && styles.bulletStrong]}>{text}</Text>
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
    paddingBottom: 8,
  },
  title: { fontSize: 16, fontWeight: '900', color: COLORS.text, letterSpacing: 1 },
  headerSpacer: { width: 40 },
  content: { padding: 22, paddingBottom: 140 },
  updated: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 14 },
  summary: {
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 8,
  },
  summaryTitle: { fontSize: 12, fontWeight: '900', color: COLORS.textLight, letterSpacing: 1, marginBottom: 8 },
  section: { marginTop: 20 },
  heading: { fontSize: 17, fontWeight: '900', color: COLORS.text, marginBottom: 8 },
  paragraph: { fontSize: 14, fontWeight: '600', color: COLORS.textLight, lineHeight: 21, marginBottom: 8 },
  list: { marginBottom: 8 },
  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  bulletDot: { fontSize: 14, fontWeight: '900', color: COLORS.primary, lineHeight: 21 },
  bulletText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textLight, lineHeight: 21 },
  bulletStrong: { color: COLORS.text, fontWeight: '700' },
  link: { color: COLORS.water, fontWeight: '800' },
});
