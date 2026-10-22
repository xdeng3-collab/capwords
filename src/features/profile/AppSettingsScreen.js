import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { ROUTES } from '../../config';
import { COLORS, RADIUS, SHADOW } from '../../theme';
import { BackButton } from '../../components';
import { loadAppSettings, setAppSetting } from '../../services/settingsService';
import { selectFeedback } from '../../utils/haptics';

const MOTION_CHOICES = [
  { value: 'system', label: 'Follow iPhone' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

/** Real, working preferences only - nothing here is a placeholder. */
export default function AppSettingsScreen({ navigation }) {
  const [settings, setSettings] = useState(null);
  const [systemReduce, setSystemReduce] = useState(false);

  useEffect(() => {
    loadAppSettings().then(setSettings);
    AccessibilityInfo.isReduceMotionEnabled().then(setSystemReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduce);
    return () => sub?.remove?.();
  }, []);

  const change = async (key, value) => {
    selectFeedback();
    setSettings(await setAppSetting(key, value));
  };

  if (!settings) return <View style={styles.container} />;

  const effective =
    settings.reduceMotion === 'on' || (settings.reduceMotion === 'system' && systemReduce);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>APP SETTINGS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.groupTitle}>MOTION</Text>
        <View style={styles.card}>
          <Text style={styles.rowLabel}>Reduce motion</Text>
          <Text style={styles.rowHint}>
            Stops the globe spinning, the sea bobbing, the buddy bouncing and the island jump.
          </Text>
          <View style={styles.segment} accessibilityRole="radiogroup">
            {MOTION_CHOICES.map((choice) => {
              const active = settings.reduceMotion === choice.value;
              return (
                <TouchableOpacity
                  key={choice.value}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                  onPress={() => change('reduceMotion', choice.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {choice.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.status}>
            {settings.reduceMotion === 'system'
              ? `Your iPhone's Reduce Motion is ${systemReduce ? 'on' : 'off'}, so animations are ${
                  effective ? 'reduced' : 'on'
                }.`
              : `Animations are ${effective ? 'reduced' : 'on'} in CapWords.`}
          </Text>
        </View>

        <Text style={styles.groupTitle}>FEEDBACK</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.rowLabel}>Haptics</Text>
              <Text style={styles.rowHint}>Little taps you feel on buttons and milestones.</Text>
            </View>
            <View style={styles.switchWrap}>
              <Switch
                value={settings.hapticFeedback}
                onValueChange={(v) => change('hapticFeedback', v)}
                trackColor={{ true: COLORS.leaf }}
              />
            </View>
          </View>
        </View>

        <Text style={styles.groupTitle}>PRIVACY</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.rowLabel}>Photo recognition</Text>
              <Text style={styles.rowHint}>
                Photos you take are sent to a third-party AI to recognise the object. When off, CapWords asks first.
              </Text>
            </View>
            <View style={styles.switchWrap}>
              <Switch
                value={settings.aiPhotoConsent}
                onValueChange={(v) => change('aiPhotoConsent', v)}
                trackColor={{ true: COLORS.leaf }}
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate(ROUTES.PRIVACY_POLICY)}
          >
            <Text style={styles.link}>Read the privacy policy</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>
          CapWords {Constants.expoConfig?.version || ''}
        </Text>
      </ScrollView>
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
    padding: 14,
    ...SHADOW.soft,
  },
  rowLabel: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  rowHint: { fontSize: 12, fontWeight: '600', color: COLORS.textLight, marginTop: 3, lineHeight: 17 },
  segment: {
    flexDirection: 'row',
    marginTop: 12,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  segmentItem: { flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: COLORS.surfaceAlt },
  segmentItemActive: { backgroundColor: COLORS.sun },
  segmentText: { fontSize: 13, fontWeight: '800', color: COLORS.textLight },
  segmentTextActive: { color: COLORS.text, fontWeight: '900' },
  status: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginTop: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchText: { flex: 1 },
  // iOS 26 draws the switch wider than the 51pt it reports, so reserve room
  // for the drawn size or it spills over the card's edge.
  switchWrap: { width: 64, alignItems: 'flex-start' },
  linkRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 2, borderTopColor: COLORS.surfaceAlt },
  link: { fontSize: 14, fontWeight: '800', color: COLORS.water },
  version: { textAlign: 'center', fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginTop: 26 },
});
